package router

import (
	"net/http"
	"net/http/httptest"
	"testing"

	coreaudit "github.com/clidey/whodb/core/src/audit"
)

func TestContextMiddlewareAddsRequestID(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "http://api.local/data", nil)
	req.Host = "api.local:8080"
	req.Header.Set("User-Agent", "tester")
	req.Header.Set("X-Request-Id", "req-1")
	req.Header.Set("Traceparent", "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01")

	rr := httptest.NewRecorder()
	var request coreaudit.Request

	handler := contextMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		request = coreaudit.RequestFromContext(r.Context())
		w.WriteHeader(http.StatusOK)
	}))

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected middleware to allow request, got status %d", rr.Code)
	}

	if request.ID != "req-1" {
		t.Fatalf("expected request id to be captured from header, got %s", request.ID)
	}
	if request.TraceID != "4bf92f3577b34da6a3ce929d0e0e4736" {
		t.Fatalf("expected trace id to be captured from traceparent, got %s", request.TraceID)
	}
	if request.SpanID != "00f067aa0ba902b7" {
		t.Fatalf("expected span id to be captured from traceparent, got %s", request.SpanID)
	}
}

func TestContextMiddlewareUsesForwardedClientIP(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "http://api.local/data", nil)
	req.RemoteAddr = "10.0.0.2:54321"
	req.Header.Set("X-Forwarded-For", "203.0.113.10, 10.0.0.2")

	rr := httptest.NewRecorder()
	var request coreaudit.Request

	handler := contextMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		request = coreaudit.RequestFromContext(r.Context())
		w.WriteHeader(http.StatusOK)
	}))

	handler.ServeHTTP(rr, req)

	if request.RemoteIP != "203.0.113.10" {
		t.Fatalf("expected forwarded client ip, got %q", request.RemoteIP)
	}
}
