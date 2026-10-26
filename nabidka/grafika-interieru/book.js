(function () {
  var TZ = "Europe/Prague";
  var USERNAME = "grafikaprodukce";
  var EVENT_SLUG = "kratky-hovor";
  var EVENT_ID = 7645353;
  var WINDOW_DAYS = 4;
  var FALLBACK = "https://cal.com/grafikaprodukce/kratky-hovor";

  var dialog = document.getElementById("book-dialog");
  if (!dialog) return;

  var openers = document.querySelectorAll("[data-book-open]");
  var daysEl = dialog.querySelector("[data-book-days]");
  var slotsEl = dialog.querySelector("[data-book-slots]");
  var form = dialog.querySelector("[data-book-form]");
  var loadingEl = dialog.querySelector("[data-book-loading]");
  var alertEl = dialog.querySelector("[data-book-alert]");
  var fallbackEl = dialog.querySelector("[data-book-fallback]");
  var chosenEl = dialog.querySelector("[data-book-chosen]");
  var whenEl = dialog.querySelector("[data-book-when]");
  var mailEl = dialog.querySelector("[data-book-mail]");
  var submitBtn = dialog.querySelector("[data-book-submit]");
  var nameInput = dialog.querySelector("#book-name");
  var emailInput = dialog.querySelector("#book-email");
  var phoneInput = dialog.querySelector("#book-phone");
  var noteInput = dialog.querySelector("#book-note");
  var lastFocus = null;
  var slotsByDay = {};
  var dayKeys = [];
  var selectedDay = "";
  var selectedSlot = "";
  var rangeStart = "";
  var rangeEnd = "";

  function show(el, on) {
    if (!el) return;
    if (on) el.removeAttribute("hidden");
    else el.setAttribute("hidden", "");
  }

  function setView(name) {
    dialog.querySelectorAll("[data-book-view]").forEach(function (view) {
      show(view, view.getAttribute("data-book-view") === name);
    });
  }

  function setAlert(text) {
    alertEl.textContent = text || "";
    show(alertEl, !!text);
  }

  function clearFieldErrors() {
    dialog.querySelectorAll("[data-error-for]").forEach(function (el) {
      el.textContent = "";
      show(el, false);
    });
    nameInput.removeAttribute("aria-invalid");
    emailInput.removeAttribute("aria-invalid");
    phoneInput.removeAttribute("aria-invalid");
  }

  function fieldError(key, input, message) {
    var el = dialog.querySelector('[data-error-for="' + key + '"]');
    if (el) {
      el.textContent = message;
      show(el, true);
    }
    input.setAttribute("aria-invalid", "true");
    input.focus();
  }

  function pragueYmd(date) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

  function addDays(ymd, days) {
    var parts = ymd.split("-").map(Number);
    var dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + days));
    var y = dt.getUTCFullYear();
    var m = String(dt.getUTCMonth() + 1).padStart(2, "0");
    var d = String(dt.getUTCDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  function dateFromYmd(ymd) {
    var parts = ymd.split("-").map(Number);
    return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 11, 0, 0));
  }

  function timeParts(iso) {
    var parts = new Intl.DateTimeFormat("cs-CZ", {
      timeZone: TZ,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(iso));
    var hour = "0";
    var minute = "00";
    parts.forEach(function (part) {
      if (part.type === "hour") hour = part.value;
      if (part.type === "minute") minute = part.value;
    });
    return { hour: String(Number(hour)), minute: minute.padStart(2, "0") };
  }

  function formatTime(iso) {
    var time = timeParts(iso);
    return time.hour.padStart(2, "0") + ":" + time.minute;
  }

  function formatCallTime(iso) {
    var time = timeParts(iso);
    return time.hour + ":" + time.minute;
  }

  function formatCallDay(iso) {
    return new Intl.DateTimeFormat("cs-CZ", {
      timeZone: TZ,
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date(iso));
  }

  function formatDayLong(isoOrYmd, isYmd) {
    var date = isYmd ? dateFromYmd(isoOrYmd) : new Date(isoOrYmd);
    var text = new Intl.DateTimeFormat("cs-CZ", {
      timeZone: TZ,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function formatDayChip(ymd) {
    var date = dateFromYmd(ymd);
    var weekday = new Intl.DateTimeFormat("cs-CZ", {
      timeZone: TZ,
      weekday: "short",
    }).format(date).replace(".", "");
    var numeric = new Intl.DateTimeFormat("cs-CZ", {
      timeZone: TZ,
      day: "numeric",
      month: "numeric",
    }).format(date);
    return { weekday: weekday, numeric: numeric };
  }

  function windowRange() {
    var start = pragueYmd(new Date());
    return { start: start, end: addDays(start, WINDOW_DAYS) };
  }

  function renderDays() {
    daysEl.replaceChildren();
    dayKeys.forEach(function (ymd) {
      var chip = formatDayChip(ymd);
      var button = document.createElement("button");
      button.type = "button";
      button.className = "book-day";
      button.setAttribute("aria-pressed", ymd === selectedDay ? "true" : "false");
      var name = document.createElement("span");
      name.className = "book-day-name";
      name.textContent = chip.weekday;
      var num = document.createElement("span");
      num.className = "book-day-num";
      num.textContent = chip.numeric;
      button.append(name, num);
      button.addEventListener("click", function () {
        selectedDay = ymd;
        selectedSlot = "";
        submitBtn.disabled = true;
        show(form, false);
        renderDays();
        renderSlots();
      });
      daysEl.appendChild(button);
    });
    show(daysEl, dayKeys.length > 0);
  }

  function renderSlots() {
    slotsEl.replaceChildren();
    var slots = slotsByDay[selectedDay] || [];
    slots.forEach(function (slot) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "book-slot";
      button.textContent = formatTime(slot.start);
      button.setAttribute("aria-pressed", slot.start === selectedSlot ? "true" : "false");
      button.addEventListener("click", function () {
        selectedSlot = slot.start;
        submitBtn.disabled = false;
        chosenEl.textContent = formatDayLong(slot.start, false) + ", " + formatTime(slot.start);
        show(form, true);
        renderSlots();
        form.scrollIntoView({ block: "nearest" });
      });
      slotsEl.appendChild(button);
    });
    show(slotsEl, slots.length > 0);
  }

  function applySlots(data) {
    slotsByDay = {};
    dayKeys = Object.keys(data || {})
      .filter(function (ymd) {
        return ymd >= rangeStart && ymd <= rangeEnd && Array.isArray(data[ymd]) && data[ymd].length > 0;
      })
      .sort();
    dayKeys.forEach(function (ymd) {
      slotsByDay[ymd] = data[ymd].slice().sort(function (a, b) {
        return String(a.start).localeCompare(String(b.start));
      });
    });
    selectedDay = dayKeys[0] || "";
    selectedSlot = "";
    submitBtn.disabled = true;
    show(form, false);
    show(loadingEl, false);
    show(fallbackEl, dayKeys.length === 0);
    renderDays();
    renderSlots();
  }

  function loadSlots() {
    var range = windowRange();
    rangeStart = range.start;
    rangeEnd = range.end;
    setView("pick");
    setAlert("");
    show(loadingEl, true);
    show(daysEl, false);
    show(slotsEl, false);
    show(form, false);
    show(fallbackEl, false);
    var url = new URL("https://api.cal.com/v2/slots");
    url.searchParams.set("username", USERNAME);
    url.searchParams.set("eventTypeSlug", EVENT_SLUG);
    url.searchParams.set("start", rangeStart);
    url.searchParams.set("end", rangeEnd);
    url.searchParams.set("timeZone", TZ);
    return fetch(url.toString(), {
      method: "GET",
      headers: { "cal-api-version": "2024-09-04" },
      credentials: "omit",
    })
      .then(function (res) {
        if (!res.ok) throw new Error("slots");
        return res.json();
      })
      .then(function (body) {
        applySlots(body && body.data ? body.data : {});
      })
      .catch(function () {
        show(loadingEl, false);
        setView("error");
      });
  }

  function openDialog(from) {
    lastFocus = from || document.activeElement;
    if (dialog.open) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    loadSlots();
  }

  function closeDialog() {
    if (typeof dialog.close === "function" && dialog.open) dialog.close();
    else dialog.removeAttribute("open");
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function toE164(raw) {
    var compact = String(raw || "").trim().replace(/[\s.\-()/]/g, "");
    if (!compact || compact === "+") return "";
    if (compact.indexOf("00") === 0) compact = "+" + compact.slice(2);
    if (compact.charAt(0) !== "+") {
      if (/^420\d{9}$/.test(compact)) compact = "+" + compact;
      else if (/^\d{9}$/.test(compact)) compact = "+420" + compact;
    }
    if (!/^\+[1-9]\d{7,14}$/.test(compact)) return "";
    return compact;
  }

  function formatPhone(e164) {
    if (/^\+420\d{9}$/.test(e164)) {
      var national = e164.slice(4);
      return "+420 " + national.slice(0, 3) + " " + national.slice(3, 6) + " " + national.slice(6);
    }
    return e164;
  }

  function onSubmit(event) {
    event.preventDefault();
    clearFieldErrors();
    setAlert("");
    var name = nameInput.value.trim();
    var email = emailInput.value.trim();
    var phone = toE164(phoneInput.value);
    var note = noteInput.value.trim();
    if (!selectedSlot) {
      setAlert("Vyberte čas hovoru.");
      return;
    }
    if (!name) {
      fieldError("name", nameInput, "Napište jméno.");
      return;
    }
    if (email && !validEmail(email)) {
      fieldError("email", emailInput, "Napište platný e-mail.");
      return;
    }
    if (!phone) {
      fieldError("phone", phoneInput, "Napište telefon včetně předvolby, třeba +420 732 828 692.");
      return;
    }
    var attendee = {
      name: name,
      timeZone: TZ,
      language: "cs",
      phoneNumber: phone,
    };
    if (email) attendee.email = email;
    var responses = { attendeePhoneNumber: phone };
    if (note) responses.notes = note;
    var payload = {
      start: selectedSlot,
      eventTypeId: EVENT_ID,
      attendee: attendee,
      bookingFieldsResponses: responses,
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Odesílám";
    fetch("https://api.cal.com/v2/bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "cal-api-version": "2026-02-25",
      },
      credentials: "omit",
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          return { ok: res.ok, status: res.status, body: body };
        });
      })
      .then(function (result) {
        submitBtn.textContent = "Potvrdit hovor";
        var booking = result.body && result.body.data;
        if (result.ok && booking && (booking.status === "accepted" || booking.status === "pending")) {
          var start = booking.start || selectedSlot;
          whenEl.textContent = "Zavolám vám v " + formatCallDay(start) + " v " + formatCallTime(start) + " na číslo " + formatPhone(phone) + ".";
          show(mailEl, !!email);
          setView("success");
          return;
        }
        if (result.status === 409 || result.status === 422) {
          setAlert("Ten čas se mezitím obsadil. Vyberte prosím jiný.");
          submitBtn.disabled = true;
          show(form, false);
          selectedSlot = "";
          return loadSlots().then(function () {
            setAlert("Ten čas se mezitím obsadil. Vyberte prosím jiný.");
          });
        }
        setView("error");
      })
      .catch(function () {
        submitBtn.textContent = "Potvrdit hovor";
        submitBtn.disabled = !selectedSlot;
        setView("error");
      });
  }

  openers.forEach(function (opener) {
    opener.addEventListener("click", function (event) {
      event.preventDefault();
      openDialog(opener);
    });
  });

  dialog.querySelectorAll("[data-book-close]").forEach(function (button) {
    button.addEventListener("click", closeDialog);
  });

  dialog.querySelectorAll("[data-book-message]").forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      closeDialog();
      var target = document.getElementById("zprava");
      if (target && typeof target.scrollIntoView === "function") {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      if (history.replaceState) history.replaceState(null, "", "#zprava");
    });
  });

  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) closeDialog();
  });

  dialog.addEventListener("close", function () {
    submitBtn.disabled = true;
    submitBtn.textContent = "Potvrdit hovor";
    clearFieldErrors();
    setAlert("");
  });

  form.addEventListener("submit", onSubmit);

  var retry = dialog.querySelector("[data-book-retry]");
  if (retry) {
    retry.addEventListener("click", function () {
      loadSlots();
    });
  }

  if (location.hash === "#rezervace") {
    openDialog(openers[0] || null);
  }
})();

(function () {
  var form = document.getElementById("offer-inquiry");
  if (!form) return;

  var ENDPOINT = "https://formsubmit.co/ajax/lumir@grafikaprodukce.cz";
  var SUBJECT = "Poptávka z nabídkové stránky – grafika interiéru";
  var OK_MSG = "Děkujeme, zpráva byla odeslána. Ozvu se vám.";
  var ERR_MSG = "Odeslání se nepovedlo. Napište na lumir@grafikaprodukce.cz.";
  var nameInput = document.getElementById("offer-name");
  var emailInput = document.getElementById("offer-email");
  var msgInput = document.getElementById("offer-msg");
  var statusEl = document.getElementById("offer-status");
  var submitBtn = form.querySelector(".submit-btn");
  var btnLabel = submitBtn ? submitBtn.textContent : "odeslat";
  var sending = false;

  function showError(id, input, message) {
    var el = document.getElementById(id);
    if (message) {
      input.setAttribute("aria-invalid", "true");
      if (el) {
        el.hidden = false;
        el.textContent = message;
      }
    } else {
      input.removeAttribute("aria-invalid");
      if (el) {
        el.hidden = true;
        el.textContent = "";
      }
    }
  }

  function setStatus(message, tone) {
    if (!statusEl) return;
    statusEl.hidden = !message;
    statusEl.textContent = message || "";
    if (tone) statusEl.dataset.tone = tone;
    else delete statusEl.dataset.tone;
  }

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
  }

  [nameInput, emailInput, msgInput].forEach(function (input) {
    input.addEventListener("input", function () {
      if (input.getAttribute("aria-invalid") === "true") {
        showError(input.id + "-error", input, "");
      }
    });
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (sending) return;
    var name = nameInput.value.trim();
    var email = emailInput.value.trim();
    var msg = msgInput.value.trim();
    var nameMsg = name ? "" : "Doplňte jméno.";
    var emailMsg = validEmail(email) ? "" : "Zadejte platný e-mail.";
    var msgMsg = msg ? "" : "Napište zprávu.";
    showError("offer-name-error", nameInput, nameMsg);
    showError("offer-email-error", emailInput, emailMsg);
    showError("offer-msg-error", msgInput, msgMsg);
    var firstInvalid = null;
    if (nameMsg) firstInvalid = nameInput;
    else if (emailMsg) firstInvalid = emailInput;
    else if (msgMsg) firstInvalid = msgInput;
    if (firstInvalid) {
      setStatus("");
      firstInvalid.focus();
      return;
    }

    var honey = form.querySelector('[name="_honey"]');
    var payload = {
      "jméno": name,
      "zpráva": msg,
      email: email,
      _replyto: email,
      _subject: SUBJECT,
      _template: "table",
      _captcha: "false",
      _honey: honey ? honey.value : "",
    };

    sending = true;
    var needsActivation = false;
    setStatus("");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Odesílám…";
    }
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        var message = (result.data && result.data.message) || "";
        if (!result.ok || String(result.data && result.data.success) !== "true") {
          if (/activat/i.test(message)) {
            needsActivation = true;
            setStatus("Formulář je potřeba znovu aktivovat. Zpráva se neodeslala.", "error");
            return;
          }
          throw new Error(message || "send");
        }
        form.reset();
        setStatus(OK_MSG, "ok");
      })
      .catch(function () {
        setStatus(ERR_MSG, "error");
      })
      .then(function () {
        sending = false;
        if (submitBtn && !needsActivation) {
          submitBtn.disabled = false;
          submitBtn.textContent = btnLabel;
        }
      });
  });
})();
