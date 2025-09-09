Content Requests & Moderation (quick guide)

- Users can create manual content requests via content_request table using createContentRequest().
- Admin/Moderators can list/approve/reject requests.
- Notifications are sent on approval/rejection.

Role flags
- app_user has is_admin and is_moderator.
- Set via SQL (service role) or Supabase SQL editor:
  update public.app_user set is_admin = true where username = 'yourname';

API helpers
- createContentRequest({ title, content_type_id, release_date?, description?, poster_path?, external_ids? })
- listMyContentRequests()
- listPendingContentRequests()
- approveContentRequest(id)
- rejectContentRequest(id, reason?)
- deleteReviewComment(commentId)
- deleteReviewReply(replyId)

Status values
- 1=PENDING, 2=APPROVED, 3=REJECTED

Notes
- DB-side functions approve_content_request / reject_content_request handle status and notifications.
- RLS allows owners to manage their own pending requests, and privileged users to manage all.