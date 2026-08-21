# Analytics scrub — founder step-sheet

**Property:** GA4 `G-VEEHTL66LR` · **Pixel:** Meta `1351380140193716`
**Prepared:** 2026-08-15 · Dashboard work — none of this is done from the repo.

---

## Read this first: what the `verify_probe` tag actually covers

There is **no code that tags test traffic**. `utm_source=verify_probe` was planted
by hand into the `atlas_attrib` first-touch cookie on one browser profile. Events
read their UTMs from that cookie (`track.ts:180` → `readAttributionCookie()`), and
when the cookie is missing that function returns `{}` — so the event goes out with
**no `utm_source` at all**, not with a blank one.

Three consequences that shape everything below:

1. **Only conversions carry the tag.** `assessment_start` and `assessment_complete`
   include `utm_source` as an **event parameter**. `page_view` does **not** — GA4
   derives a pageview's source from the **landing URL** query string instead. So
   the two need different treatment.
2. **First-touch wins, so tagging can silently fail.** The cookie is only written
   when none exists. Testing on a browser that already has an `atlas_attrib`
   cookie means the test events inherit **that campaign's** UTMs — contaminating
   real campaign numbers, and invisible to a `verify_probe` filter.
3. **One event escaped the tag entirely** — see §3.

---

## 1. Exclude test traffic from reports (recommended, non-destructive)

⚠️ GA4 **Data filters** only support *Internal traffic* and *Developer traffic*.
You **cannot** build a data filter on `utm_source`, and no GA4 filter is
retroactive — filters only affect data collected after they are created. So the
working tool for existing data is a **comparison**, not a filter.

1. Open any standard report → **Add comparison +** (top of the report).
2. **Condition:** `Session source` — **exactly matches** — `verify_probe`
3. Set the include/exclude toggle to **Exclude**.
4. **Apply**, then **Save comparison** as `Exclude verify_probe`.

That removes the tagged sessions from what you're looking at. For a permanent
clean view, rebuild the same condition inside **Explore → Free form** as a
segment.

**Also worth doing, for the future:** Admin → Data collection and modification →
**Data filters** → *Internal traffic*, defining your own IP. That is the
supported way to keep future test traffic out of the property for good — it
works prospectively only, which is why it doesn't help with what's already there.

---

## 2. Actually delete the tagged data (only if it must be gone)

GA4: **Admin → Data collection and modification → Data deletion requests → Schedule data deletion request.**

⚠️ **Read the limitation before using this.** GA4 deletion requests operate on a
**date range** (optionally narrowed to specific parameters or user identifiers) —
**not** on "sessions where source = verify_probe". The test traffic is interleaved
in time with real traffic, so a date-range deletion **will also delete real
family data from those days**.

Recommendation: **use §1 (exclude in reports) and do not run a broad deletion**,
unless you specifically need the test data physically removed. Deletion requests
take up to 7 days to process and cannot be undone.

If you do proceed, the narrowest useful form is:
- **Request type:** *Delete registered parameters on selected events*
- **Events:** `assessment_start`, `assessment_complete`
- **Date range:** the test window only
- This strips the parameters; it does not remove the event rows.

---

## 3. The one event a filter cannot catch — targeted deletion

**One `page_view` on `/dashboard` was fired before the `verify_probe` cookie
existed.** Its landing URL carried no UTMs, so:

- it is **not** attributed to `verify_probe` (the §1 comparison misses it), and
- it carries no event parameter to match on (§2's parameter deletion misses it).

It is a single pageview with no conversion attached, so the honest recommendation
is **leave it** — it inflates the pageview count by one and affects nothing else.

If it must go: **Admin → Data collection and modification → Data deletion
requests → Delete all data for selected date range**, scoped to
**2026-08-15 only**. Note this deletes *all* GA4 data for that day, including the
real traffic — which is very likely a worse trade than one stray pageview.

---

## 4. Meta pixel

The pixel received **zero** test conversions. `assessment_start` and
`assessment_complete` were both **queued, not sent** — `fbq` is deliberately
absent on `/report?child=<uuid>` so a child identifier can never reach Meta, and
the events sit in a browser-local queue waiting for a clean URL.

**Action required — do this before anything else:**

> On the test browser profile, clear site data for `app.samnewyork.com`
> (Chrome → Settings → Privacy → Third-party cookies → See all site data →
> `samnewyork.com` → Delete). This drops the queued events **and** the
> `atlas_attrib` cookie.

If you skip this, the next time that profile opens any parent page, the queue
flushes and **two test conversions land in Meta** — after you thought the scrub
was finished.

Meta received only a handful of `PageView` events. Meta Events Manager has no
retroactive per-event deletion; `PageView` noise is not worth a data deletion
request. If you want it gone regardless: Events Manager → Data Sources → the
pixel → **Settings → Request data deletion**.

---

## Checklist

- [ ] Clear site data on the test browser profile *(do first — prevents new test events)*
- [ ] GA4: save the `Exclude verify_probe` comparison
- [ ] GA4: add an Internal traffic data filter for your IP *(stops future test traffic)*
- [ ] Decide on §2 deletion — **default: skip it**
- [ ] Decide on §3 stray pageview — **default: leave it**
- [ ] Meta: no action unless you want the `PageView` noise gone

---

## Appendix — what was fired, for the record

| Event | Tagged `verify_probe`? | Count |
|---|---|---|
| GA4 `assessment_start` | yes | 2 |
| GA4 `assessment_complete` | yes | 1 |
| GA4 `page_view` (tagged navigations) | via session source | ~12 |
| GA4 `page_view` `/dashboard` pre-cookie | **NO** | 1 |
| Meta `assessment_start` / `assessment_complete` | queued, **never sent** | 0 |
| Meta `PageView` | n/a (pixel carries no UTM tag) | ~6 |

GA4 menu labels move between releases; the paths above are current as of
2026-08. If a label has changed, search Admin for "data deletion" or "data
filters".
