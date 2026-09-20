#!/usr/bin/env bash
# launch-audit.sh <https://your-domain> — the automatable half of
# templates/launch-checklist.md, in ~10 s of curl. Prints ✅ / ⚠️ / ❌ per
# item; the rows it cannot check (DPAs, Search Console, Google Audience,
# smoke test) are listed at the end for the operator. Exit code is always 0:
# this is a report, not a gate. Written after the first go-live (2026-09-20);
# the long explanation is templates/launch-playbook.md.
set -u
url="${1:?usage: launch-audit.sh https://your-domain}"
url="${url%/}"; host="${url#https://}"; host="${host#http://}"
UA="Mozilla/5.0 (launch-audit)"
ok(){ printf '✅ %s\n' "$1"; }
bad(){ printf '❌ %s\n' "$1"; }
warn(){ printf '⚠️  %s\n' "$1"; }
hdrval(){ awk -v k="$1" 'tolower($1)==k":"{sub(/^[^:]*:[ \t]*/,""); print}' | tr -d '\r' | head -1; }

printf '== launch audit · %s · %s ==\n' "$url" "$(date -u +%Y-%m-%dT%H:%MZ)"

# 1 · http → https
loc=$(curl -sI --max-time 10 "http://$host/" | hdrval location)
case "$loc" in https://*) ok "http → https ($loc)";; *) bad "http:// does not redirect to https (Location: ${loc:-none})";; esac

# 2 · www → apex
wcode=$(curl -s -o /dev/null --max-time 10 -w '%{http_code}' "https://www.$host/")
wloc=$(curl -sI --max-time 10 "https://www.$host/" | hdrval location)
case "$wcode" in
  301|308) ok "www → apex ($wloc)";;
  200) warn "www.$host answers 200 — duplicate content; add a Redirect Rule www → root (Cloudflare template) or a canonical";;
  000) warn "www.$host does not resolve (fine if you never want www)";;
  *) warn "www.$host: HTTP $wcode";;
esac

# 3 · security headers
hdr=$(curl -sI --max-time 10 "$url/")
for h in strict-transport-security content-security-policy x-content-type-options referrer-policy; do
  if printf '%s' "$hdr" | grep -qi "^$h:"; then ok "header $h"; else bad "missing header $h"; fi
done
if printf '%s' "$hdr" | grep -Eqi "^x-frame-options:|frame-ancestors"; then ok "clickjacking: x-frame-options / frame-ancestors"; else bad "no x-frame-options / frame-ancestors"; fi

# 4 · robots + sitemap
robots=$(curl -s --max-time 10 "$url/robots.txt")
if printf '%s' "$robots" | grep -qi "^user-agent"; then ok "robots.txt"; else bad "robots.txt missing"; fi
sm=$(printf '%s\n' "$robots" | awk 'tolower($1)=="sitemap:"{print $2}' | tr -d '\r' | head -1)
[ -n "$sm" ] || warn "robots.txt has no Sitemap: line"
smurl="${sm:-$url/sitemap.xml}"
smct=$(curl -s -o /dev/null --max-time 10 -w '%{content_type}' "$smurl")
case "$smct" in *xml*) ok "sitemap $smurl";; *) bad "sitemap not served as XML ($smurl → ${smct:-none})";; esac

# 5 · real 404
code=$(curl -s -o /dev/null --max-time 10 -w '%{http_code}' "$url/launch-audit-does-not-exist-$RANDOM")
if [ "$code" = "404" ]; then ok "unknown path → 404"; else warn "unknown path → HTTP $code (soft 404: add a 404 page)"; fi

# 6 · <head> basics
html=$(curl -s --max-time 15 -A "$UA" "$url/")
has(){ printf '%s' "$html" | grep -qi -- "$1"; }
if has '<title>'; then ok "<title>: $(printf '%s' "$html" | grep -oi '<title>[^<]*' | head -1 | cut -c8-90)"; else bad "no <title>"; fi
has 'name="description"' && ok "meta description" || bad "no meta description"
has 'rel="canonical"' && ok "canonical" || warn "no canonical"
if has 'property="og:title"' && has 'property="og:image"'; then ok "Open Graph (title + image)"; else bad "Open Graph incomplete (og:title / og:image)"; fi
has 'name="twitter:card"' && ok "Twitter card" || warn "no twitter:card"
has 'application/ld+json' && ok "structured data (JSON-LD)" || warn "no JSON-LD"
has 'name="viewport"' && ok "viewport meta (mobile)" || bad "no viewport meta"
has 'lang=' && ok "<html lang>" || warn "no lang attribute on <html>"
og=$(printf '%s' "$html" | grep -oi 'property="og:image" content="[^"]*' | head -1 | sed 's/.*content="//')
if [ -n "$og" ]; then
  ct=$(curl -s -o /dev/null --max-time 10 -w '%{content_type}' "$og")
  case "$ct" in image/*) ok "og:image reachable ($ct)";; *) bad "og:image is not an image ($og → ${ct:-none})";; esac
fi

# 7 · favicon
fav=$(printf '%s' "$html" | grep -oi '<link[^>]*rel="[^"]*icon[^"]*"[^>]*' | head -1)
case "$fav" in
  *'href="data:'*) warn "favicon is a data: URI — Google Search ignores it; also serve /favicon.png (48×48) and link it";;
  "") warn "no favicon <link>";;
  *) ok "favicon linked";;
esac
fct=$(curl -s -o /dev/null --max-time 10 -w '%{content_type}' "$url/favicon.ico")
case "$fct" in image/*) ok "/favicon.ico served";; *) warn "/favicon.ico not served (${fct:-none}) — browsers and crawlers still ask for it";; esac

# 8 · weight and speed
ttfb=$(curl -s -o /dev/null --max-time 15 -w '%{time_starttransfer}' "$url/")
ok "TTFB ${ttfb}s (run PageSpeed Insights mobile for the full picture)"
for a in $(printf '%s' "$html" | grep -oE '(src|href)="[^"]+\.(js|css)"' | sed 's/.*="//;s/"$//' | sort -u); do
  case "$a" in http*) u="$a";; /*) u="$url$a";; *) u="$url/$a";; esac
  sz=$(curl -s -o /dev/null --max-time 15 -H 'Accept-Encoding: br,gzip' -w '%{size_download}' "$u")
  printf '   · %s  %s KB compressed\n' "$a" $((sz/1024))
done

# 9 · third parties in the HTML — hosts named inside a <meta http-equiv="Content-Security-Policy">
#     are a policy, not a request, so that tag is dropped before looking.
nocsp=$(printf '%s' "$html" | sed 's/<meta[^>]*http-equiv="Content-Security-Policy"[^>]*>//gi')
thirds=$(printf '%s' "$nocsp" | grep -oE 'https?://[a-zA-Z0-9.-]+' | sed 's#https\{0,1\}://##' | grep -v -e "^$host\$" -e "^www\.$host\$" -e 'schema.org' | sort -u | tr '\n' ' ')
if [ -z "$thirds" ]; then ok "no third-party hosts in the HTML (no cookie banner needed if the app adds none)"; else warn "third-party hosts in the HTML: $thirds — each one may set cookies/need consent"; fi

# 10 · external links in the HTML (an SPA's inner pages are not crawled here)
for l in $(printf '%s' "$html" | grep -oE 'href="https?://[^"]+' | sed 's/href="//' | grep -v "$host" | sort -u); do
  c=$(curl -s -o /dev/null -L --max-time 12 -A "$UA" -w '%{http_code}' "$l")
  if [ "$c" = "200" ]; then ok "link $l"; else bad "link $l → HTTP $c"; fi
done

cat <<'MANUAL'

Only the operator can close these (see templates/launch-checklist.md):
  · provider DPAs noted (dates + links)        · Redirect Rule www → root (if ⚠️ above)
  · Search Console: domain verified + sitemap submitted
  · Google Auth Platform: brand verified, Audience = Production
  · PageSpeed Insights (mobile) ≥ 90 or a reason  · smoke test on the real domain, phone + desktop
MANUAL
