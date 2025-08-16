# Unsupported content type should be 415
POST http://localhost:8080/v1/fragments
Content-Type: application/unsupported-type
[BasicAuth]
user1@email.com:password1
`nope`

HTTP/1.1 415
