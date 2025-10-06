# Upload Flow QA Matrix

- Supported types: PDF, CSV, Excel
- Size limits: <1MB, 5MB, 20MB, 26MB (expect error)
- Network: online, flaky (toggle via throttling), offline (expect retry guidance)
- States: idle, uploading, pinning, processing, ready, error, canceled
- Duplicate detection: same name+size -> prompt
- Paste link: valid/invalid URL, .pdf/.csv suffix
- Accessibility: focus, labels, live regions on progress and errors
- Analytics: events fire with expected params

Steps:
1) Open UploadModal and test type selection
2) Observe progress percent and ETA
3) Cancel mid-upload
4) Retry and complete; document appears in Recent -> becomes Ready
5) Try duplicate upload and choose each prompt option
6) Paste link path
7) Verify analytics logs in console
