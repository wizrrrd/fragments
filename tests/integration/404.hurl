# 404 Test
GET http://localhost:8080/no-such-route

HTTP/1.1 404
Content-Type: application/json; charset=utf-8

[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error" exists
jsonpath "$.error.code" == 404
jsonpath "$.error.message" isString
