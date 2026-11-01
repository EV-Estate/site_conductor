use axum::{
	Router,
	body::Body,
	extract::DefaultBodyLimit,
	http::{HeaderValue, Method, Request},
	routing::{get, post},
};
use ev_lib::error_monitoring::{NewSentryLayer, SentryHttpLayer};
use tower::ServiceBuilder;
use tower_http::{
	cors::{AllowOrigin, Any, CorsLayer},
	trace::TraceLayer,
};
#[cfg(feature = "swagger")]
use utoipa::OpenApi;
#[cfg(feature = "swagger")]
use utoipa_swagger_ui::SwaggerUi;

#[cfg(feature = "swagger")]
use crate::api::openapi::ApiDoc;
use crate::api::{handler, state::AppState};

/// Assemble the HTTP surface: versioned routes, Swagger UI (when the `swagger`
/// feature is on), and the observability + CORS middleware stack.
pub fn build(state: AppState, cors_allowed_origins: Option<Vec<HeaderValue>>) -> Router {
	let routes = Router::new()
		.route("/health", get(handler::health::health))
		.route("/vacancies", get(handler::vacancy::list_vacancies))
		.route("/vacancies/{slug}", get(handler::vacancy::get_vacancy))
		.route("/applications", post(handler::application::create_application))
		.route("/contact", post(handler::contact::create_contact))
		.route("/newsletter", post(handler::newsletter::subscribe_newsletter));

	let app = Router::new().nest("/api/v1", routes);
	#[cfg(feature = "swagger")]
	let app = app.merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()));

	app.layer(
		ServiceBuilder::new()
			.layer(NewSentryLayer::<Request<Body>>::new_from_top())
			.layer(SentryHttpLayer::new().enable_transaction()),
	)
	.layer(TraceLayer::new_for_http())
	.layer(cors(cors_allowed_origins))
	// 64 KiB comfortably fits the largest legitimate form submit while keeping
	// multi-megabyte junk out of the handlers.
	.layer(DefaultBodyLimit::max(64 * 1024))
	.with_state(state)
}

/// The site and the API share `estate.evinvest.ltd`, so the landing itself
/// never needs CORS; the allow-list keeps other sites' browsers from driving
/// the public forms. No cookies or auth ride on these requests, hence no
/// credentials. `None` is the dev fallback (frontend and backend on different
/// localhost ports); config makes it unreachable in production.
fn cors(allowed_origins: Option<Vec<HeaderValue>>) -> CorsLayer {
	match allowed_origins {
		None => CorsLayer::permissive(),
		Some(origins) => CorsLayer::new()
			.allow_origin(AllowOrigin::list(origins))
			.allow_methods([Method::GET, Method::POST])
			// Mirrors the old permissive policy for headers: the generated client
			// sends `content-type`, and Sentry's browser tracing adds its own.
			.allow_headers(Any),
	}
}

#[cfg(test)]
mod tests {
	use axum::{
		body::Body,
		http::{Request, StatusCode, header},
		routing::post,
	};
	use tower::ServiceExt;

	use super::*;

	async fn preflight(allowed: Option<Vec<HeaderValue>>, origin: &str) -> Option<HeaderValue> {
		let app = Router::new().route("/api/v1/contact", post(|| async { StatusCode::NO_CONTENT })).layer(cors(allowed));
		let request = Request::builder()
			.method(Method::OPTIONS)
			.uri("/api/v1/contact")
			.header(header::ORIGIN, origin)
			.header(header::ACCESS_CONTROL_REQUEST_METHOD, "POST")
			.body(Body::empty())
			.expect("static request");
		let response = app.oneshot(request).await.expect("router is infallible");
		response.headers().get(header::ACCESS_CONTROL_ALLOW_ORIGIN).cloned()
	}

	#[tokio::test]
	async fn listed_origin_is_allowed() {
		let site = HeaderValue::from_static("https://estate.evinvest.ltd");
		assert_eq!(preflight(Some(vec![site.clone()]), "https://estate.evinvest.ltd").await, Some(site));
	}

	#[tokio::test]
	async fn unlisted_origin_gets_no_allow_header() {
		let site = HeaderValue::from_static("https://estate.evinvest.ltd");
		assert_eq!(preflight(Some(vec![site]), "https://evil.example").await, None);
	}

	#[tokio::test]
	async fn without_a_list_any_origin_is_allowed() {
		assert_eq!(preflight(None, "http://localhost:58843").await, Some(HeaderValue::from_static("*")));
	}
}
