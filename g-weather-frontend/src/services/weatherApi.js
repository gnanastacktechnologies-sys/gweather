const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:17205/api';

/**
 * Check backend API health status
 * GET /api/health
 */
export const getHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.success === true;
  } catch (error) {
    return false;
  }
};

/**
 * Fetch latest weather telemetry
 * GET /api/weather
 */
export const getLatestWeather = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/weather`);

    if (!response.ok) {
      if (response.status === 404) {
        return { success: true, data: null, message: "No weather data available" };
      }
      throw new Error(`Server returned status HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch historical weather telemetry & daily summary
 * GET /api/weather/history?limit=50&days=7
 */
export const getWeatherHistory = async (limit = 50, days = 0) => {
  try {
    const url = new URL(`${API_BASE_URL}/weather/history`);
    if (limit) url.searchParams.append('limit', limit);
    if (days) url.searchParams.append('days', days);

    const response = await fetch(url.toString());
    if (!response.ok) {
      return { success: true, data: [], summary: {} };
    }
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: true, data: [], summary: {} };
  }
};
