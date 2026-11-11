var sessionO = [];
var sessionI = [];

var orders = [];
var currentPizza = 0;
var sessionOpt = 0;

var adminKey = "";
var ordersTimer = null;

// All writes go to the Worker now. The old code posted a path and a body to
// wtf.php, which wrote any file on the server.
function apiRequest(method, url, data, done, fail) {
  $.ajax({
    url: url,
    method: method,
    dataType: "json",
    contentType: "application/json",
    data: data === undefined ? undefined : JSON.stringify(data),
    headers: { "x-admin-key": adminKey },
    success: function (response) {
      if (done) done(response);
    },
    error: function (xhr) {
      if (xhr.status === 401) {
        adminKey = "";
        pageHandler.loadPage("login");
      }
      if (fail) fail(xhr);
    },
  });
}

function addMenuItem(kind, name, done) {
  apiRequest("POST", "/api/menu", { kind: kind, name: name }, done);
}

function removeElement(Element, kind) {
  apiRequest("DELETE", "/api/menu", { kind: kind, name: Element });
}

function selectSessionIngredients() {
  apiRequest("GET", "/api/menu", undefined, function (data) {
    var ingredients = data.ingredients || [];
    $("#content").append(
      `<p class="ingredient used tES" style="display: none;">${ingredients[0]}</p>`
    );
    for (let i = 1; i < ingredients.length; i++) {
      $("#content").append(
        `<p class="ingredient used" style="display: none;">${ingredients[i]}</p>`
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
            sessionI.push($(this).text());
          }
        });
        console.log(sessionI);
        selectSessionO();
      });
    }, 100);
  });
}

function selectSessionO() {
  $("#content").empty();
  apiRequest("GET", "/api/menu", undefined, function (data) {
    var options = data.options || [];
    for (let i = 0; i < options.length; i++) {
      $("#content").append(
        `<p class="option used" style="display: none;">${options[i]}</p>`
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
            sessionO.push($(this).text());
          }
        });
        console.log(sessionO);
        showOrders(1);
      });
    }, 100);
  });
}

function showOrders(sendOpt) {
  $("#content").empty();
  $("#content").css("justify-content", "center");
  $("#content").load("./UI/orders.html", function () {
    if (sendOpt) {
      apiRequest(
        "POST",
        "/api/session",
        { ingredients: sessionI, options: sessionO },
        function () {
          startOrdersPolling();
        }
      );
    } else {
      startOrdersPolling();
    }
  });
}

// Polling replaces the socket.io feed. One request every 3 s, and the Worker
// answers 304 when nothing changed.
function startOrdersPolling() {
  if (ordersTimer) return;
  pollOrders(true);
  ordersTimer = setInterval(function () {
    pollOrders(false);
  }, 3000);
}

function stopOrdersPolling() {
  if (ordersTimer) {
    clearInterval(ordersTimer);
    ordersTimer = null;
  }
}

function pollOrders(reset) {
  apiRequest("GET", "/api/orders", undefined, function (rows) {
    if (reset) {
      orders = [];
      currentPizza = 0;
    }
    var changed = false;
    (rows || []).forEach(function (row) {
      var known = orders.some(function (o) {
        return o.id === row.id;
      });
      if (!known) {
        orders.push(row);
        changed = true;
      }
    });
    if (!changed) return;
    $("#iAO").empty();
    if (orders.length) loadOrder(orders[currentPizza] || orders[0]);
    updateFooter();
  });
}

function updateFooter() {
  var elemsToAdd = [];
  $("#footerWrapper").empty();
  if (orders.length > currentPizza + 1) {
    elemsToAdd.push(1);
  }
  if (currentPizza > 0) {
    elemsToAdd.push(2);
  }
  elemsToAdd
    .sort((a, b) => b - a)
    .forEach((e) => {
      if (e == 1) {
        $("#footerWrapper").append('<button id="nextPizza">Next</button>');
        $("#nextPizza").click(() => {
          currentPizza++;
          $("#iAO").empty();
          updateFooter();
          loadOrder(orders[currentPizza]);
        });
      }
      if (e == 2) {
        $("#footerWrapper").append('<button id="beforePizza">Back</button>');
        $("#beforePizza").click(() => {
          currentPizza--;
          $("#iAO").empty();
          updateFooter();
          loadOrder(orders[currentPizza]);
        });
      }
    });
}

function loadOrder(pizza) {
  if (!pizza) return;
  $("#tName").text(pizza.N);
  $("#iAO").append(`
    <tr>
      <td style="4color: #ff0000;">${pizza.C}</td>
    </tr>
  `);
  for (let i = 0; i < pizza.O.length; i++) {
    $("#iAO").append(`
      <tr>
        <td>${pizza.O[i]}</td>
      </tr>
  `);
  }
  for (let i = 0; i < pizza.I.length; i++) {
    $("#iAO").append(`
      <tr>
        <td>${pizza.I[i]}</td>
      </tr>
  `);
  }
}
