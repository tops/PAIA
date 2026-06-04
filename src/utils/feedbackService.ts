import type { Feedback } from '../types';

const BASE_URL = 'https://firestore.googleapis.com/v1/projects/pai-monitor-2026/databases/(default)/documents/feedback';

/**
 * Submits user feedback to Google Cloud Firestore using the REST API.
 */
export async function submitFeedback(feedback: Omit<Feedback, 'id' | 'timestamp' | 'resolved'>): Promise<void> {
  const payload = {
    fields: {
      name: { stringValue: feedback.name || '' },
      email: { stringValue: feedback.email || '' },
      category: { stringValue: feedback.category },
      message: { stringValue: feedback.message },
      page: { stringValue: feedback.page },
      timestamp: { stringValue: new Date().toISOString() },
      resolved: { booleanValue: false }
    }
  };

  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Firestore POST error:', errorText);
    throw new Error('Misslyckades att skicka feedback till servern.');
  }
}

/**
 * Fetches all feedback entries from Google Cloud Firestore.
 */
export async function getFeedback(): Promise<Feedback[]> {
  const response = await fetch(`${BASE_URL}?pageSize=200`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Firestore GET error:', errorText);
    throw new Error('Misslyckades att hämta feedback från servern.');
  }

  const data = await response.json();
  if (!data.documents) {
    return [];
  }

  return data.documents.map((doc: any) => {
    const id = doc.name.split('/').pop() || '';
    const fields = doc.fields || {};
    return {
      id,
      name: fields.name?.stringValue || '',
      email: fields.email?.stringValue || '',
      category: (fields.category?.stringValue || 'Annat') as Feedback['category'],
      message: fields.message?.stringValue || '',
      page: fields.page?.stringValue || '',
      timestamp: fields.timestamp?.stringValue || doc.createTime || new Date().toISOString(),
      resolved: fields.resolved?.booleanValue || false
    };
  });
}

/**
 * Deletes a feedback entry from Google Cloud Firestore.
 */
export async function deleteFeedback(docId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/${docId}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Firestore DELETE error:', errorText);
    throw new Error('Misslyckades att ta bort feedbacken.');
  }
}

/**
 * Toggles the resolved status of a feedback entry in Google Cloud Firestore.
 */
export async function toggleFeedbackResolved(docId: string, currentResolvedStatus: boolean): Promise<void> {
  const url = `${BASE_URL}/${docId}?updateMask.fieldPaths=resolved`;
  const payload = {
    fields: {
      resolved: { booleanValue: !currentResolvedStatus }
    }
  };

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Firestore PATCH error:', errorText);
    throw new Error('Misslyckades att uppdatera feedback-status.');
  }
}
