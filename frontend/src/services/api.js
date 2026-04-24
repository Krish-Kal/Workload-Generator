import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

/**
 * Upload & Processing APIs
 */

export const uploadTimetables = async (files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const { data } = await api.post('/timetable/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

export const processTimetables = async (batchId, entries) => {
  const { data } = await api.post('/timetable/process', {
    batchId,
    entries,
  });
  return data;
};

/**
 * Analytics APIs
 */

export const fetchWorkloadAnalytics = async (params = {}) => {
  const { data } = await api.get('/timetable/analytics/workload', { params });
  return data;
};

export const fetchConflictAnalysis = async () => {
  const { data } = await api.get('/timetable/analytics/conflicts');
  return data;
};

export const fetchSuggestions = async () => {
  const { data } = await api.get('/timetable/analytics/suggestions');
  return data;
};

export const fetchQualityReport = async () => {
  const { data } = await api.get('/timetable/analytics/quality');
  return data;
};

/**
 * Audit & History APIs
 */

export const fetchBatchAuditTrail = async (batchId) => {
  const { data } = await api.get(`/timetable/audit/${batchId}`);
  return data;
};

/**
 * Export APIs
 */

export const exportData = async (type = 'workload', format = 'json') => {
  const response = await api.get('/timetable/export', {
    params: { type, format },
    responseType: format === 'json' ? 'json' : 'blob',
  });
  return response;
};

/**
 * Legacy APIs (for backward compatibility)
 */

export const fetchWorkload = async (params = {}) => {
  try {
    const data = await fetchWorkloadAnalytics(params);
    return data.workloads;
  } catch (error) {
    console.error('Error fetching workload:', error);
    throw error;
  }
};

export const fetchConflicts = async () => {
  try {
    const data = await fetchConflictAnalysis();
    return data.conflicts;
  } catch (error) {
    console.error('Error fetching conflicts:', error);
    throw error;
  }
};

export const exportWorkload = async (format = 'json') => {
  return exportData('workload', format);
};

export default api;

