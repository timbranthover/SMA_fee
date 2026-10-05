# UBS family document vault concept

Desktop-first interactive prototype with fictional households and documents. Open index.html using a static server. No build or dependencies required.

## Demonstration

1. Start as client Amelia Hamilton. Open a document to inspect its details, permissions and history.
2. Select Advisor view. Create a request for the Hamilton family.
3. Select Client view, open Requests and upload a sample document to that request.
4. Switch to Advisor view and review the received document. Mark it reviewed.
5. Open Family & access. Adjust Oliver's document access and preview his view.

All demo changes are browser-local, shared across the two perspectives and retained in localStorage. Reset demo restores the original sample data. Real upload bytes are held only in browser memory and are never sent to a server. A reload retains metadata only. Uploaded PDFs and images can be previewed during the session. Other supported formats show metadata.

This is a concept demonstration, not an official UBS product or a production vault. Permission previews model the product experience and are not server-side security controls. No authentication, encryption service, real invitations, email delivery or real client information is involved.
