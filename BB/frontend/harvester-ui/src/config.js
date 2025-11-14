const DEFAULT_API_URL = 'http://localhost:5001/api';
export const API_URL = process.env.REACT_APP_API_URL || DEFAULT_API_URL;
export const JORADP_API_URL = process.env.REACT_APP_JORADP_API_URL || `${API_URL}/joradp`;
export const COURSUPREME_API_URL =
  process.env.REACT_APP_COURSUPREME_API_URL || `${API_URL}/coursupreme`;
