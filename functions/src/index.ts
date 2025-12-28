import {initializeApp} from 'firebase-admin/app';
import {FieldValue, getFirestore} from 'firebase-admin/firestore';
import {onDocumentWritten} from 'firebase-functions/v2/firestore';

initializeApp();
const db = getFirestore();

type InviteRequestData = {
  status?: unknown;
  projectId?: unknown;
  projectTitle?: unknown;
  role?: unknown;
  invitedByName?: unknown;
  invitedByEmail?: unknown;
  cleanedAt?: unknown;
};

/**
 * Checks whether a value is a non-null object.
 * @param {unknown} value The value to check.
 * @return {boolean} True if the value is a non-null object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Reads a string field from Firestore data.
 * @param {Record<string, unknown>} data Firestore document data.
 * @param {string} key Field name.
 * @return {string} The string value or empty string.
 */
function getStringField(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  return typeof value === 'string' ? value : '';
}

/**
 * Normalizes Firestore doc data into a typed shape with unknown fields.
 * @param {unknown} raw Raw Firestore document data.
 * @return {InviteRequestData} Normalized invite request data.
 */
function getInviteRequestData(raw: unknown): InviteRequestData {
  if (!isRecord(raw)) return {};
  return raw as InviteRequestData;
}

/**
 * Builds the notification subtitle without exceeding max-len.
 * @param {string} inviterName Inviter display name or email.
 * @param {string} projectTitle Project title.
 * @param {string} role Role label.
 * @return {string} Notification subtitle.
 */
function buildInviteSubtitle(
  inviterName: string,
  projectTitle: string,
  role: string,
): string {
  return (
    inviterName +
    ' is inviting you to collaborate in "' +
    projectTitle +
    '" as ' +
    role +
    '. Tap to view.'
  );
}

export const onInviteNotification = onDocumentWritten(
  'pending_requests/{email}/requests/{inviteId}',
  async (event) => {
    const after = event.data?.after;
    if (!after?.exists) return;

    const inviteId = String(event.params.inviteId || '').trim();
    const email = String(event.params.email || '').trim().toLowerCase();
    if (!inviteId || !email) return;

    const raw = after.data();
    const record: Record<string, unknown> = isRecord(raw) ? raw : {};
    const data = getInviteRequestData(record);

    const status = typeof data.status === 'string' ? data.status : 'pending';
    if (status !== 'pending') return;

    const projectId = getStringField(record, 'projectId').trim();
    const projectTitle = getStringField(record, 'projectTitle').trim();
    const role = (getStringField(record, 'role') || 'Member').trim();

    const invitedByName = getStringField(record, 'invitedByName').trim();
    const invitedByEmail = getStringField(record, 'invitedByEmail').trim();
    const inviterName = invitedByName || invitedByEmail || 'Someone';

    const notifRootRef = db.doc('notifications/' + email);
    const notifItemRef = notifRootRef.collection('items').doc(inviteId);
    const subTitle = buildInviteSubtitle(inviterName, projectTitle, role);

    const batch = db.batch();
    batch.set(
      notifRootRef,
      {ownerEmail: email, lastUpdated: FieldValue.serverTimestamp()},
      {merge: true},
    );

    batch.set(
      notifItemRef,
      {
        inviteId: inviteId,
        projectId: projectId,
        title: 'New Project Invitation',
        subTitle: subTitle,
        type: 'project_invite',
        unread: true,
        time: FieldValue.serverTimestamp(),
      },
      {merge: true},
    );

    await batch.commit();
  },
);

export const onInviteResponseCleanup = onDocumentWritten(
  'pending_requests/{email}/requests/{inviteId}',
  async (event) => {
    const after = event.data?.after;
    if (!after?.exists) return;

    const inviteId = String(event.params.inviteId || '').trim();
    const email = String(event.params.email || '').trim().toLowerCase();
    if (!inviteId || !email) return;

    const raw = after.data();
    const record: Record<string, unknown> = isRecord(raw) ? raw : {};
    const data = getInviteRequestData(record);

    const status = typeof data.status === 'string' ? data.status : 'pending';
    if (status !== 'accepted' && status !== 'declined') return;

    const alreadyCleaned =
      data.cleanedAt !== undefined && data.cleanedAt !== null;
    if (alreadyCleaned) return;

    const inviteRef =
      db.doc('pending_requests/' + email + '/requests/' + inviteId);
    const notifItemRef =
      db.doc('notifications/' + email + '/items/' + inviteId);

    const batch = db.batch();
    batch.delete(notifItemRef);
    batch.set(
      inviteRef,
      {cleanedAt: FieldValue.serverTimestamp()},
      {merge: true},
    );

    try {
      await batch.commit();
    } catch (err) {
      void err;
    }
  },
);

