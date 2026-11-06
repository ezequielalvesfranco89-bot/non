"""Validated configuration and normalized events for the authoritative engine."""
from __future__ import annotations

import re
import unicodedata
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

Identifier = Annotated[str, StringConstraints(min_length=1, max_length=160, pattern=r'^[A-Za-z0-9_.:@/\-]+$')]
Animation = Literal['slash', 'spark', 'burst', 'critical', 'legendary', 'heal', 'power', 'none']
Sound = Literal['hit', 'follow', 'victory', 'critical', 'legendary', 'heal', 'power', 'none']


def clean_text(value: str, length: int = 120) -> str:
    """Remove control characters; presentation layers still render as plain text."""
    return ''.join(c for c in value if not unicodedata.category(c).startswith('C'))[:length].strip()


class Model(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True, allow_inf_nan=False)


class Action(Model):
    enabled: bool = True
    type: Literal['damage', 'heal', 'power'] = 'damage'
    amount: int = Field(default=100, ge=1, le=1_000_000)
    animation: Animation = 'spark'
    sound: Sound = 'follow'

    @model_validator(mode='after')
    def bounded_power(self):
        if self.type == 'power' and self.amount > 120:
            raise ValueError('O poder deve durar entre 1 e 120 segundos.')
        return self


class GiftRule(Model):
    gift_id: Identifier
    name: str = Field(min_length=1, max_length=80)
    damage: int = Field(default=35, ge=0, le=1_000_000)
    multiplier: float = Field(default=1.0, ge=0.1, le=100)
    animation: Animation = 'slash'
    sound: Sound = 'hit'
    enabled: bool = True


class FollowerGoal(Model):
    id: Identifier
    target: int = Field(ge=1, le=1_000_000)
    action: Action


def default_gifts():
    return [
        GiftRule(gift_id='demo-rose', name='Rosa (teste)', damage=35),
        GiftRule(gift_id='demo-strong', name='Ataque forte (teste)', damage=140, animation='burst'),
        GiftRule(gift_id='demo-critical', name='Crítico (teste)', damage=250, multiplier=2, animation='critical', sound='critical'),
        GiftRule(gift_id='demo-legendary', name='Leão lendário (teste)', damage=1000, animation='legendary', sound='legendary'),
    ]


def default_goals():
    return [
        FollowerGoal(id='goal-5', target=5, action=Action(amount=500, animation='burst', sound='victory')),
        FollowerGoal(id='goal-10', target=10, action=Action(type='heal', amount=50, animation='heal', sound='heal')),
        FollowerGoal(id='goal-25', target=25, action=Action(type='power', amount=30, animation='power', sound='power')),
    ]


class Settings(Model):
    monster_hp: int = Field(default=1500, ge=100, le=10_000_000)
    difficulty_multiplier: float = Field(default=1.18, ge=1, le=3)
    boss_attack_interval: float = Field(default=12.0, ge=2, le=300)
    boss_attack_damage: int = Field(default=8, ge=0, le=100)
    transition_seconds: float = Field(default=3.0, ge=0, le=30)
    volume: float = Field(default=0.35, ge=0, le=1)
    animations: bool = True
    appearance: Literal['eclipse', 'ember', 'ocean'] = 'eclipse'
    boss_names: dict[str,str] = Field(default_factory=lambda: {'golem':'Guardião de Obsidiana','specter':'Espectro do Eclipse','dragon':'Dragão da Tempestade'})
    like_damage: int = Field(default=1, ge=0, le=1000)
    comment_damage: int = Field(default=15, ge=0, le=100_000)
    gift_rules: list[GiftRule] = Field(default_factory=default_gifts, max_length=200)
    follow_action: Action = Field(default_factory=Action)
    follower_goals: list[FollowerGoal] = Field(default_factory=default_goals, max_length=50)

    @model_validator(mode='after')
    def unique_configuration(self):
        if set(self.boss_names) != {'golem','specter','dragon'}:
            raise ValueError('Configure os nomes dos três tipos de chefe.')
        for kind,name in self.boss_names.items():
            self.boss_names[kind] = clean_text(name,80)
            if not self.boss_names[kind]: raise ValueError('O chefe precisa de um nome.')
        ids = [g.gift_id for g in self.gift_rules]
        if len(set(ids)) != len(ids):
            raise ValueError('Cada identificador de presente deve ser único.')
        ids = [g.id for g in self.follower_goals]
        targets = [g.target for g in self.follower_goals]
        if len(set(ids)) != len(ids) or len(set(targets)) != len(targets):
            raise ValueError('Identificadores e metas de seguidores devem ser únicos.')
        for gift in self.gift_rules:
            gift.name = clean_text(gift.name, 80)
            if not gift.name:
                raise ValueError('O nome do presente não pode ficar vazio.')
        return self


def validate_settings(data: dict) -> dict:
    return Settings.model_validate(data).model_dump()


class NormalizedEvent(Model):
    event_id: str = Field(min_length=1, max_length=512)
    source: Literal['simulation', 'tiktok']
    type: Literal['gift', 'follow', 'like', 'comment']
    user_id: str = Field(min_length=1, max_length=256)
    name: str = Field(min_length=1, max_length=256)
    avatar: str | None = Field(default=None, max_length=2048)
    gift_id: str | None = Field(default=None, min_length=1, max_length=160)
    gift_name: str | None = Field(default=None, max_length=160)
    repeat_count: int = Field(default=1, ge=1, le=100_000)
    combo_id: str | None = Field(default=None, min_length=1, max_length=512)
    like_count: int = Field(default=1, ge=1, le=100_000)
    text: str = Field(default='', max_length=500)

    @model_validator(mode='after')
    def normalize(self):
        self.name = clean_text(self.name) or 'Espectador'
        self.text = clean_text(self.text, 500)
        if self.gift_name:
            self.gift_name = clean_text(self.gift_name, 80)
        if self.type == 'gift' and not self.gift_id:
            raise ValueError('O evento de presente precisa de gift_id.')
        if self.avatar and not re.match(r'^https://[^\s<>]+$', self.avatar):
            self.avatar = None
        if not self.user_id.strip() or not self.event_id.strip():
            raise ValueError('O evento precisa de identificação estável.')
        return self
