# Create a text fragment with charset; verify GET returns the same text
POST http://localhost:8080/v1/fragments
Content-Type: text/plain; charset=utf-8
[BasicAuth]
user1@email.com:password1
`charset ok`

HTTP/1.1 201
[Asserts]
jsonpath "$.status" == "ok"
# your API includes charset in metadata; allow both just in case
jsonpath "$.fragment.type" matches "^text/plain(\\s*;\\s*charset=utf-8)?$"

[Captures]
url: header "Location"

GET {{url}}
Accept: text/plain
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
[Asserts]
header "Content-Type" matches "^text/plain(\\s*;\\s*charset=utf-8)?$"
body == "charset ok"
