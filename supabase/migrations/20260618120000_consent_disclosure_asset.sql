-- Atlas Assessment — tie each consent record to the served disclosure asset.
--
-- COPPA consent-of-record: in addition to the verbatim CONSENT_TEXT attestation
-- already stored per row, capture WHICH disclosure document the parent consented
-- under — its version identifier and the sha256 of the served PDF bytes
-- (public/legal/coppa-disclosure-v1.pdf). This makes each row provable against
-- the exact disclosure version in force at grant time, not just the checkbox
-- wording.
--
-- Nullable: pre-existing rows (granted before this asset existed) keep NULL;
-- every new row written by the /add-child action populates both (see
-- src/lib/consent/text.ts DISCLOSURE_VERSION / DISCLOSURE_CONTENT_SHA256).

alter table consent_records
  add column disclosure_version       text,
  add column disclosure_content_sha256 text;

comment on column consent_records.disclosure_version is
  'Identifier of the disclosure document the parent consented under, e.g. coppa-disclosure-v1.';
comment on column consent_records.disclosure_content_sha256 is
  'sha256 hex of the served disclosure PDF bytes at grant time (content-hash of record).';
