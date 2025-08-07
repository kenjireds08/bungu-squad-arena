export VERCEL_TOKEN="your_token_here"
curl -X DELETE \
  "https://api.vercel.com/v2/domains/ranking.bungu-squad.jp/cache" \
  -H "Authorization: Bearer $VERCEL_TOKEN"
