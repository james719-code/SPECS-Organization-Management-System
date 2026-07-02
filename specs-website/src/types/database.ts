export interface ModelsDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions?: string[];
  $databaseId?: string;
  $collectionId?: string;
}

export type UserType = "student" | "officer" | "admin";

export interface AccountDoc extends ModelsDocument {
  username: string;
  type: UserType;
  verified: boolean;
  deactivated: boolean;
  students?: StudentDoc | string | null;
  admins?: AdminDoc | string | null;
  officers?: OfficerDoc | string | null;
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
}

export interface AttendanceDoc extends ModelsDocument {
  students?: StudentDoc | string | null;
  events?: EventDoc | string | null;
  name_attendance: string;
  officers?: OfficerDoc | string | null;
}

export interface PaymentDoc extends ModelsDocument {
  students?: StudentDoc | string | null;
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
  recorder?: string | null;
}

export interface RevenueDoc extends ModelsDocument {
  name?: string | null;
  isEvent: boolean;
  event?: string | null;
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
  title?: string | null;
  post_details?: string | null;
  related_links?: string[] | null;
  meaning?: string[] | null;
  students?: StudentDoc | string | null;
}

export interface FileDoc extends ModelsDocument {
  fileName?: string | null;
  description?: string | null;
  uploader?: string | null;
  fileID?: string | null;
}
