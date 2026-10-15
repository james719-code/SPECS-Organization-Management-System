export interface ModelsDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions?: string[];
  $databaseId?: string;
  $collectionId?: string;
}

export type UserType = "student" | "officer" | "admin";

export type NotificationAudience = 'all' | 'students' | 'officers' | 'specific';
export type NotificationPriority = 'normal' | 'important' | 'urgent';

export interface NotificationDoc extends ModelsDocument {
  title: string;
  body: string;
  audience: NotificationAudience;
  priority: NotificationPriority;
  link?: string | null;
  createdAt: string;
  expiresAt?: string | null;
  createdByUid: string;
  recipientUid?: string | null;
  readAt?: string | null;
}

export interface StudentSnapshot {
  id?: string;
  $id?: string;
  name?: string | null;
  email?: string | null;
  section?: string | null;
  yearLevel?: number | null;
  student_id?: number | null;
  is_volunteer?: boolean | null;
  volunteer_request_status?: string | null;
}

export interface OfficerSnapshot {
  id?: string;
  $id?: string;
  position?: string | null;
  displayName?: string | null;
  email?: string | null;
  pictureId?: string | null;
  studentId?: string | null;
  students?: StudentSnapshot | null;
}

export interface AdminSnapshot {
  id?: string;
  $id?: string;
  fullName?: string | null;
  email?: string | null;
  contactNumber?: string | null;
}

export interface EventSnapshot {
  id?: string;
  $id?: string;
  event_name?: string | null;
  date_to_held?: string | null;
  location?: string | null;
  archived?: boolean | null;
}

export interface AccountDoc extends ModelsDocument {
  username: string;
  type: UserType;
  verified: boolean;
  deactivated: boolean;
  students?: StudentDoc | string | null;
  admins?: AdminDoc | string | null;
  officers?: OfficerDoc | string | null;
  studentId?: string | null;
  officerId?: string | null;
  adminId?: string | null;
  displayName?: string | null;
  email?: string | null;
  studentSnapshot?: StudentSnapshot | null;
  officerSnapshot?: OfficerSnapshot | null;
  adminSnapshot?: AdminSnapshot | null;
  dataModelVersion?: number;
}

export interface StudentDoc extends ModelsDocument {
  name: string;
  email?: string | null;
  section?: string | null;
  address?: string | null;
  yearLevel?: number | null;
  student_id: number;
  is_volunteer: boolean;
  volunteer_request_status?: "none" | "pending" | "approved" | "rejected" | "backout_pending" | string;
  payments?: PaymentDoc[] | null;
}

export interface OfficerDoc extends ModelsDocument {
  students?: StudentDoc | string | null;
  studentId?: string | null;
  accountUid?: string | null;
  displayName?: string | null;
  studentEmail?: string | null;
  studentNumber?: number | null;
  studentSnapshot?: StudentSnapshot | null;
  dataModelVersion?: number;
  isSchedule: boolean;
  scheduleId?: string | null;
  position?: string | null;
  pictureId?: string | null;
}

export interface AdminDoc extends ModelsDocument {
  fullName: string;
  email: string;
  contactNumber?: string | null;
}

export interface EventDoc extends ModelsDocument {
  event_name?: string | null;
  date_to_held?: string | null;
  added_by?: string | null;
  image_file?: string | null;
  description?: string | null;
  event_ended: boolean;
  archived?: boolean | null;
  collab?: string[] | null;
  related_links?: string[] | null;
  meaning?: string[] | null;
  location?: string | null;
  rating_links?: string | null;
  related_links_name?: string[] | null;
  createdByUid?: string | null;
  imageFileId?: string | null;
  collaboratorIds?: string[] | null;
  dataModelVersion?: number;
}

export interface AttendanceDoc extends ModelsDocument {
  students?: StudentDoc | string | null;
  events?: EventDoc | string | null;
  name_attendance: string;
  officers?: OfficerDoc | string | null;
  attendance_type?: 'student' | 'officer' | 'non-member' | null;
  'non-member-name'?: string | null;
  'non-member-email'?: string | null;
  custom_session_id?: string | null;
  custom_session_name?: string | null;
  studentId?: string | null;
  eventId?: string | null;
  sessionId?: string | null;
  studentSnapshot?: StudentSnapshot | null;
  eventSnapshot?: EventSnapshot | null;
  dataModelVersion?: number;
}

export interface CustomSessionStub {
  id: string;
  name: string;
  createdAt: string;
  ended?: boolean;
}

export interface PaymentDoc extends ModelsDocument {
  students?: StudentDoc | string | null;
  studentId?: string | null;
  eventId?: string | null;
  officerId?: string | null;
  studentSnapshot?: StudentSnapshot | null;
  eventSnapshot?: EventSnapshot | null;
  officerSnapshot?: OfficerSnapshot | null;
  amount?: number | null;
  dataModelVersion?: number;
  is_event: boolean;
  activity?: string | null;
  price: number;
  item_name: string;
  quantity: number;
  date_paid: string;
  events?: EventDoc | string | null;
  officers?: OfficerDoc | string | null;
  is_outside_bscs: boolean;
  non_bscs_name?: string | null;
  is_paid: boolean;
  modal_paid?: string | null;
  verified_by_name?: string | null;
}

export interface ExpenseDoc extends ModelsDocument {
  price?: number | null;
  quantity: number;
  name?: string | null;
  date_buy?: string | null;
  isEvent: boolean;
  activity_name?: string | null;
  events?: EventDoc | string | null;
  eventId?: string | null;
  eventSnapshot?: EventSnapshot | null;
  amount?: number | null;
  dataModelVersion?: number;
  recorder?: string | null;
}

export interface RevenueDoc extends ModelsDocument {
  name?: string | null;
  isEvent: boolean;
  event?: string | null;
  eventId?: string | null;
  eventSnapshot?: EventSnapshot | null;
  amount?: number | null;
  dataModelVersion?: number;
  activity?: string | null;
  quantity?: number | null;
  price?: number | null;
  date_earned?: string | null;
  recorder?: string | null;
}

export interface StoryDoc extends ModelsDocument {
  post_description?: string | null;
  image_bucket?: string | null;
  isAccepted: boolean;
  officerApproval?: boolean;
  adminApproval?: boolean;
  title?: string | null;
  post_details?: string | null;
  related_links?: string[] | null;
  meaning?: string[] | null;
  students?: StudentDoc | string | null;
  authorId?: string | null;
  authorSnapshot?: StudentSnapshot | null;
  imageFileId?: string | null;
  dataModelVersion?: number;
}

export interface TaskDoc extends ModelsDocument {
  name?: string | null;
  description?: string | null;
  connected_files?: string[] | null;
  is_done: boolean;
  name_of_done?: string | null;
  time_done?: string | null;
}

export interface FileDoc extends ModelsDocument {
  fileName?: string | null;
  description?: string | null;
  uploader?: string | null;
  fileID?: string | null;
}
