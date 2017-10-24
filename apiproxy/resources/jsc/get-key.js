 var proxyName = context.getVariable("proxyName");
 var proxyRevision = context.getVariable("proxyRev");
 
 if (!proxyName || !proxyRevision) {
     throw new Error("Missing mandatory query params!");
 }
 
 context.setVariable("endpointLookup", proxyName+"_"+proxyRevision);