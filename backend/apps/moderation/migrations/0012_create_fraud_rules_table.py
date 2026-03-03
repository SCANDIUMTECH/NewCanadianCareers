"""
Create the fraud_rules table that was skipped by migration 0004's SeparateDatabaseAndState.

Migration 0004 used SeparateDatabaseAndState for FraudRule, assuming the table already
existed. It never did — only Django model state was tracked, no CREATE TABLE was issued.
This migration creates the actual table using CREATE TABLE IF NOT EXISTS for safety.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('moderation', '0011_platformsettings_slack_fields'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                CREATE TABLE IF NOT EXISTS fraud_rules (
                    id bigserial PRIMARY KEY,
                    created_at timestamptz NOT NULL DEFAULT now(),
                    updated_at timestamptz NOT NULL DEFAULT now(),
                    name varchar(255) NOT NULL,
                    description text NOT NULL DEFAULT '',
                    enabled boolean NOT NULL DEFAULT true,
                    severity varchar(10) NOT NULL DEFAULT 'medium',
                    conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
                    triggers_count integer NOT NULL DEFAULT 0,
                    false_positives_count integer NOT NULL DEFAULT 0
                );
            """,
            reverse_sql="DROP TABLE IF EXISTS fraud_rules;",
        ),
    ]
