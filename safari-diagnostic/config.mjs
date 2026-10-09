// Activation remains off until vendor checks, privacy review and explicit deployment approval.
export const config = Object.freeze({
 enabled:true, approved:true, projectToken:'phc_sygzhj6ooeu5B72dkRMVBcCjVQzwpN3RUpPP8cp5ZFsK', region:'us',
 allowedOrigins:['https://mandalaw.github.io'], vendorQA:true, retentionApproved:true,
 coarseGeoVerified:false,
 privacySummary:'Optional events will use PostHog in US Virginia. Its free plan has a one-year event query window; this is not a guaranteed deletion deadline. You can stop future collection at any time.'
});
