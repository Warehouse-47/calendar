/**
 * Warehouse47 Interest Webhook (Google Apps Script)
 *
 * Deploy steps:
 * 1) Create a Google Sheet and copy its ID from URL.
 * 2) In Apps Script: Project Settings -> Script properties, add:
 *    - SPREADSHEET_ID: <your-sheet-id>
 *    - ATTEND_SHEET_NAME: Interest - Attend (optional)
 *    - ASSOCIATE_SHEET_NAME: Interest - Associate (optional)
 * 3) Paste this code in Code.gs (or keep this filename), then Deploy -> New deployment -> Web app.
 * 4) Execute as: Me, Who has access: Anyone.
 * 5) Use the /exec URL as PUBLIC_INTEREST_APPS_SCRIPT_URL in your app.
 */

function doGet() {
  return jsonResponse({
    ok: true,
    service: 'warehouse47-interest-webhook',
    timestamp: new Date().toISOString(),
  });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var lockAcquired = false;

  try {
    lock.waitLock(10000);
    lockAcquired = true;

    var body = parseIncomingBody(e);
    var record = normalizePayload(body);

    validateCommon(record);
    if (record.interestType === 'attend') {
      validateAttend(record);
    } else if (record.interestType === 'associate') {
      validateAssociate(record);
    } else if (record.interestType === 'seeding') {
      validateSeeding(record);
    } else {
      throw new Error('Invalid interestType. Expected attend, associate, or seeding.');
    }

    var spreadsheet = getSpreadsheet_();
    var targetSheetName = getTargetSheetName_(record.interestType);
    var sheet = getOrCreateSheet_(spreadsheet, targetSheetName);
    var headers = getHeadersForType_(record.interestType);
    var values = getValuesForType_(record);

    ensureHeaders_(sheet, headers);
    sheet.appendRow(values);

    // Keep notification non-blocking so a mail issue never fails data capture.
    try {
      sendNotificationEmail_(record);
    } catch (mailError) {
      console.error('Notification email failed', mailError);
    }

    return jsonResponse({ ok: true, sheet: targetSheetName });
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: String(error && error.message ? error.message : error),
    });
  } finally {
    if (lockAcquired) {
      lock.releaseLock();
    }
  }
}

function parseIncomingBody(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Missing request body.');
  }

  var raw = String(e.postData.contents || '').trim();
  if (!raw) {
    throw new Error('Empty request body.');
  }

  try {
    return JSON.parse(raw);
  } catch (jsonError) {
    // Fallback: allow payload=<json-string> form submissions.
    if (e.parameter && e.parameter.payload) {
      return JSON.parse(String(e.parameter.payload));
    }
    throw new Error('Body must be valid JSON.');
  }
}

function normalizePayload(input) {
  var now = new Date();
  var timezone = Session.getScriptTimeZone() || 'Asia/Kolkata';

  return {
    submittedDate: Utilities.formatDate(now, timezone, 'yyyy-MM-dd'),
    submittedTime: Utilities.formatDate(now, timezone, 'HH:mm:ss'),
    interestType: toLower_(input.interestType),

    eventTitle: toText_(input.eventTitle),
    eventDate: toText_(input.eventDate),
    eventLocation: toText_(input.eventLocation),

    attendeeName: toText_(input.attendeeName),
    attendeeCount: toText_(input.attendeeCount),
    travelFrom: toText_(input.travelFrom),
    informedVia: toText_(input.informedVia),
    attendeeContact: toText_(input.attendeeContact),

    brandName: toText_(input.brandName),
    brandCategory: toText_(input.brandCategory),
    brandDetails: toText_(input.brandDetails),
    contactName: toText_(input.contactName),
    contactEmail: toText_(input.contactEmail),
    contactPhone: toText_(input.contactPhone),
    deliverableMandate: toText_(input.deliverableMandate),
    budgetRange: toText_(input.budgetRange),
    notes: toText_(input.notes),

    seedingBrandType: toText_(input.seedingBrandType),
    seedingBrandName: toText_(input.seedingBrandName),
    seedingPocName: toText_(input.seedingPocName),
    seedingPocEmail: toText_(input.seedingPocEmail),
    seedingPocPhone: toText_(input.seedingPocPhone),
    seedingServiceNeeds: toText_(input.seedingServiceNeeds),
    seedingPartnerPreference: toText_(input.seedingPartnerPreference),
    seedingEventContext: toText_(input.seedingEventContext),
    seedingTentativeDates: toText_(input.seedingTentativeDates),
    seedingMarket: toText_(input.seedingMarket),
    seedingNotes: toText_(input.seedingNotes),
  };
}

function validateCommon(row) {
  if (row.interestType === 'seeding') {
    return;
  }

  if (!row.eventTitle) {
    throw new Error('eventTitle is required.');
  }
}

function validateAttend(row) {
  if (!row.attendeeName) {
    throw new Error('attendeeName is required for attend.');
  }
  if (!row.attendeeCount) {
    throw new Error('attendeeCount is required for attend.');
  }
  if (!row.travelFrom) {
    throw new Error('travelFrom is required for attend.');
  }
  if (!row.informedVia) {
    throw new Error('informedVia is required for attend.');
  }
  if (!row.attendeeContact) {
    throw new Error('attendeeContact is required for attend.');
  }
}

function validateAssociate(row) {
  if (!row.brandName) {
    throw new Error('brandName is required for associate.');
  }
  if (!row.brandCategory) {
    throw new Error('brandCategory is required for associate.');
  }
  if (!row.contactName) {
    throw new Error('contactName is required for associate.');
  }
  if (!row.contactEmail && !row.contactPhone) {
    throw new Error('Provide at least one contact detail: contactEmail or contactPhone.');
  }
  if (!row.deliverableMandate) {
    throw new Error('deliverableMandate is required for associate.');
  }
  if (!row.budgetRange) {
    throw new Error('budgetRange is required for associate.');
  }
}

function validateSeeding(row) {
  if (!row.seedingBrandType) {
    throw new Error('seedingBrandType is required for seeding.');
  }
  if (!row.seedingBrandName) {
    throw new Error('seedingBrandName is required for seeding.');
  }
  if (!row.seedingPocName) {
    throw new Error('seedingPocName is required for seeding.');
  }
  if (!row.seedingPocEmail && !row.seedingPocPhone) {
    throw new Error('Provide at least one contact detail: seedingPocEmail or seedingPocPhone.');
  }
  if (!row.seedingServiceNeeds) {
    throw new Error('seedingServiceNeeds is required for seeding.');
  }
  if (!row.seedingEventContext) {
    throw new Error('seedingEventContext is required for seeding.');
  }
  if (!row.seedingTentativeDates) {
    throw new Error('seedingTentativeDates is required for seeding.');
  }
}

function getHeadersForType_(interestType) {
  if (interestType === 'attend') {
    return [
      'submittedDate',
      'submittedTime',
      'interestType',
      'eventTitle',
      'eventDate',
      'eventLocation',
      'attendeeName',
      'attendeeCount',
      'travelFrom',
      'informedVia',
      'attendeeContact',
    ];
  }

  if (interestType === 'seeding') {
    return [
      'submittedDate',
      'submittedTime',
      'interestType',
      'seedingBrandType',
      'seedingBrandName',
      'seedingPocName',
      'seedingPocEmail',
      'seedingPocPhone',
      'seedingServiceNeeds',
      'seedingPartnerPreference',
      'seedingEventContext',
      'seedingTentativeDates',
      'seedingMarket',
      'seedingNotes',
    ];
  }

  return [
    'submittedDate',
    'submittedTime',
    'interestType',
    'eventTitle',
    'eventDate',
    'eventLocation',
    'brandName',
    'brandCategory',
    'brandDetails',
    'contactName',
    'contactEmail',
    'contactPhone',
    'deliverableMandate',
    'budgetRange',
    'notes'
  ];
}

function getValuesForType_(record) {
  var keys = getHeadersForType_(record.interestType);
  var values = [];
  for (var i = 0; i < keys.length; i += 1) {
    values.push(toText_(record[keys[i]]));
  }
  return values;
}

function ensureHeaders_(sheet, headers) {
  if (sheet.getLastRow() > 0) {
    return;
  }

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
}

function getSpreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) {
    throw new Error('Missing Script Property: SPREADSHEET_ID');
  }
  return SpreadsheetApp.openById(id);
}

function getAttendSheetName_() {
  return PropertiesService.getScriptProperties().getProperty('ATTEND_SHEET_NAME') || 'Interest - Attend';
}

function getAssociateSheetName_() {
  return PropertiesService.getScriptProperties().getProperty('ASSOCIATE_SHEET_NAME') || 'Interest - Associate';
}

function getSeedingSheetName_() {
  return PropertiesService.getScriptProperties().getProperty('SEEDING_SHEET_NAME') || 'Interest - Seeding';
}

function getTargetSheetName_(interestType) {
  var attendName = getAttendSheetName_();
  var associateName = getAssociateSheetName_();
  var seedingName = getSeedingSheetName_();

  if (interestType === 'seeding') {
    if (seedingName === attendName || seedingName === associateName) {
      return seedingName + ' (Seeding)';
    }
    return seedingName;
  }

  if (attendName === associateName) {
    return interestType === 'attend' ? attendName + ' (Attend)' : associateName + ' (Associate)';
  }

  return interestType === 'attend' ? attendName : associateName;
}

function getOrCreateSheet_(spreadsheet, name) {
  var sheet = spreadsheet.getSheetByName(name);
  if (sheet) {
    return sheet;
  }
  return spreadsheet.insertSheet(name);
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function toText_(value) {
  if (value === null || typeof value === 'undefined') {
    return '';
  }
  return String(value).trim();
}

function toLower_(value) {
  return toText_(value).toLowerCase();
}

function sendNotificationEmail_(record) {
  var emailAddress = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL');
  if (!emailAddress) {
    return;
  }

  var formTypeLabel = record.interestType === 'attend'
    ? 'Attend'
    : record.interestType === 'associate'
      ? 'Associate'
      : 'Seeding';
  var referenceLabel = record.eventTitle || record.seedingBrandName || 'N/A';
  var subject = 'New Interest: ' + formTypeLabel + ' for ' + referenceLabel;

  var keys = getHeadersForType_(record.interestType);
  var bodyLines = [];
  bodyLines.push('A new interest submission was received.');
  bodyLines.push('');

  for (var i = 0; i < keys.length; i += 1) {
    var key = keys[i];
    var value = toText_(record[key]);
    if (value) {
      bodyLines.push(key + ': ' + value);
    }
  }

  MailApp.sendEmail({
    to: emailAddress,
    subject: subject,
    body: bodyLines.join('\n'),
  });
}
