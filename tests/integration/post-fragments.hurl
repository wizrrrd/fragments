# Plain-text round-trip (use charset to match server behavior)
POST http://localhost:8080/v1/fragments
Content-Type: text/plain; charset=utf-8
[BasicAuth]
user1@email.com:password1
`This is a fragment!`

HTTP/1.1 201
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" matches "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
# accept with or without charset
jsonpath "$.fragment.type" matches "^text/plain(\\s*;\\s*charset=utf-8)?$"
jsonpath "$.fragment.size" == 19

[Captures]
url: header "Location"

GET {{url}}
Accept: text/plain
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
[Asserts]
header "Content-Type" matches "^text/plain(\\s*;.*)?$"
body == "This is a fragment!"
