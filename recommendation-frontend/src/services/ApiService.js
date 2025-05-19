const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const ApiService = {
  async request(endpoint, options = {}) {
    const { body, method = "GET", token, isFormData = false } = options;
    const headers = isFormData ? {} : { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const config = { method, headers };
    if (body) config.body = isFormData ? body : JSON.stringify(body);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
      let errorData;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        errorData = await response.json().catch(() => ({
          message: `API request failed with status ${response.status} but error response was not valid JSON.`,
        }));
      } else {
        const errorText = await response
          .text()
          .catch(() => `API request failed with status ${response.status}.`);
        errorData = { message: errorText };
      }

      const errorMessage =
        errorData.detail?.[0]?.msg ||
        errorData.detail ||
        errorData.message ||
        `API request failed: ${response.status}`;
      const error = new Error(errorMessage);
      error.response = response;
      error.data = errorData;
      throw error;
    }
    if (
      response.status === 204 ||
      response.headers.get("content-length") === "0"
    ) {
      return null;
    }
    return response.json();
  },

  registerUser: (userData) =>
    ApiService.request("/api/v1/users/register", {
      method: "POST",
      body: userData,
    }),

  loginUser: async (credentials) => {
    const formData = new URLSearchParams();
    formData.append("username", credentials.username);
    formData.append("password", credentials.password);

    const response = await fetch(`${API_BASE_URL}/api/v1/users/login/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData,
    });

    if (!response.ok) {
      let errorData;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        errorData = await response.json().catch(() => ({
          message: `Login request failed with status ${response.status} but error response was not valid JSON.`,
        }));
      } else {
        const errorText = await response
          .text()
          .catch(() => `Login request failed with status ${response.status}.`);
        errorData = { message: errorText };
      }
      const errorMessage =
        errorData.detail?.[0]?.msg ||
        errorData.detail ||
        errorData.message ||
        "Login failed";
      const error = new Error(errorMessage);
      error.response = response;
      error.data = errorData;
      throw error;
    }
    return response.json();
  },

  getCurrentUser: (token) => ApiService.request("/api/v1/users/me", { token }),

  getMovies: (skip = 0, limit = 10, token, search = null, genres = null) => {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });
    if (search) {
      params.append("search", search);
    }
    if (genres) {
      params.append("genres", genres);
    }
    return ApiService.request(`/api/v1/movies/?${params.toString()}`, {
      token,
    });
  },

  getMovieById: (movieId, token) =>
    ApiService.request(`/api/v1/movies/${movieId}`, { token }),
  createMovie: (movieData, token) =>
    ApiService.request("/api/v1/movies/", {
      method: "POST",
      body: movieData,
      token,
    }),
  rateMovie: (ratingData, token) =>
    ApiService.request("/api/v1/ratings/", {
      method: "POST",
      body: ratingData,
      token,
    }),
  getMyRecommendations: (token, count = 5, exclude_watched = true) =>
    ApiService.request(
      `/api/v1/recommendations/user/me?count=${count}&exclude_watched=${exclude_watched}`,
      { token },
    ),
  triggerRetrainModel: (token) =>
    ApiService.request("/trigger-retrain-model", { method: "POST", token }),
  deleteMovie: async (movieId, token) => {
    console.warn(
      `Attempting to delete movie ${movieId}. Note: Backend API endpoint for deletion might not be specified in the OpenAPI schema or implemented.`,
    );
    return Promise.resolve({
      message: `Movie ${movieId} delete action simulated. (API endpoint pending).`,
    });
  },
};

export default ApiService;
