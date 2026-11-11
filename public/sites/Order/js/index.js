/*******************************************************************************
Copyright © 2021 Ennio Marke
Polling replaces the socket.io server that no longer exists.
*******************************************************************************/
$(document).ready(function () {
  var pizzaI = [],
    pizzaO = [],
    pizzaN = "",
    pizzaC = "",
    options = 0;

  var started = false;
  var waitingShown = false;
  var sessionTimer = null;

  function pollSession() {
    $.ajax({
      url: "/api/session",
      dataType: "json",
      cache: false,
      timeout: 4000,
      success: function (session) {
        if (started) return;
        if (!session) {
          showNoSession();
          return;
        }
        started = true;
        stopSessionPolling();
        $("#content").empty();
        waitingShown = false;
        options = { I: session.ingredients, O: session.options };
        if (checkForSession()) {
          getPizzaIngredients();
        }
      },
    });
  }

  // Keep polling: the page switches to the order flow when the admin starts a session.
  function showNoSession() {
    if (waitingShown) return;
    waitingShown = true;
    $("#content").css("justify-content", "center");
    $("#content").append(
      `<p style="margin-bottom: 8vh;">There is currently no session</p>`
    );
  }

  function startSessionPolling() {
    if (sessionTimer) return;
    pollSession();
    sessionTimer = setInterval(pollSession, 3000);
  }

  function stopSessionPolling() {
    if (sessionTimer) {
      clearInterval(sessionTimer);
      sessionTimer = null;
    }
  }

  function checkForSession() {
    if (options == 0) {
      $("#content").css("justify-content", "center");
      $("#content").append(
        `<p style="margin-bottom: 8vh;">There is currently no session</p>`
      );
      return false;
    }
    return true;
  }

  function getPizzaIngredients() {
    $("#content").css("justify-content", "flex-start");
    for (let i = 0; i < options.I.length; i++) {
      $("#content").append(
        `<p class="ingredient used" style="display: none;">${options.I[i]}</p>`
      );
    }
    $("#content").append(`<button id="next">Next</button>`);
    setTimeout(() => {
      $("#content *").fadeIn();
      $(".ingredient").click(function (e) {
        $(this).toggleClass("used");
      });
      $("#next").click(function (e) {
        $("#content > p").each(function () {
          if (!$(this).hasClass("used")) {
            pizzaI.push($(this).text());
          }
        });
        console.log(`Pizza Ingredients: ${JSON.stringify(pizzaI)}`);
        getPizzaOptions();
      });
    }, 100);
  }

  function getPizzaOptions() {
    $("#content").empty();
    for (let i = 0; i < options.O.length; i++) {
      $("#content").append(
        `<p class="option used" style="display: none;">${
          options.O[i] != undefined ? options.O[i] : "No options"
        }</p>`
      );
    }
    $("#content").append(`<button id="next">Next</button>`);
    setTimeout(() => {
      $("#content *").fadeIn();
      $(".option").click(function (e) {
        $(this).toggleClass("used");
      });
      $("#next").click(function (e) {
        $("#content > p").each(function () {
          if (!$(this).hasClass("used")) {
            pizzaO.push($(this).text());
          }
        });
        console.log(`Pizza Options: ${JSON.stringify(pizzaO)}`);
        getPizzaName();
      });
    }, 100);
  }

  function getPizzaName() {
    $("#content").css("justify-content", "center");
    $("#content")
      .empty()
      .append('<input type="text" id="name" style="display: none;">')
      .append('<h1 id="nameHeading" style="display: none;">Name</h1>')
      .append('<button id="next" style="display: none;">Next</button>');
    $("#content *").fadeIn();
    function next() {
      pizzaN = $("#name").val();
      console.log(`Pizza Name: ${JSON.stringify(pizzaN)}`);
      getPizzaComments();
    }
    $("#name").keypress((e) => {
      if (e.which == 13) next();
    });
    $("#next").click(next);
  }

  function getPizzaComments() {
    $("#content").css("justify-content", "center");
    $("#content")
      .empty()
      .append('<input type="text" id="comment" style="display: none;">')
      .append(
        '<h1 id="commentHeading" style="display: none;">Anmerkungen</h1>'
      )
      .append('<button id="next" style="display: none;">Send</button>');
    $("#content *").fadeIn();
    function next() {
      pizzaC = $("#comment").val();
      console.log(`Pizza Comments: ${JSON.stringify(pizzaC)}`);
      sendPizzaOrder();
    }
    $("#comment").keypress((e) => {
      if (e.which == 13) next();
    });
    $("#next").click(next);
  }

  function sendPizzaOrder() {
    $.ajax({
      url: "/api/orders",
      method: "POST",
      contentType: "application/json",
      dataType: "json",
      data: JSON.stringify({
        name: pizzaN,
        comment: pizzaC,
        ingredients: pizzaI,
        options: pizzaO,
      }),
      success: function () {
        $("#content")
          .empty()
          .append(
            '<p style="margin-bottom: 8vh;">Your order will arrive soon!</p>'
          );
      },
      error: function (xhr) {
        var message =
          xhr.status === 409
            ? "There is currently no session."
            : "The order did not go through. Try again.";
        $("#content")
          .empty()
          .append(`<p style="margin-bottom: 8vh;">${message}</p>`);
      },
    });
  }

  // Stop polling while the tab is hidden: saves Worker requests.
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      stopSessionPolling();
    } else if (!started) {
      startSessionPolling();
    }
  });

  startSessionPolling();

  $.ajaxSetup({
    cache: false,
  });
});
