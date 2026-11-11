let login = new page(
  "login",
  (callback) => {
    // The Worker checks the key on every admin request now.
    $("#content")
      .append('<input type="password" id="adminPsw" style="display: none;">')
      .append('<button id="loginBtn" style="display: none;">Login</button>')
      .append('<h1 id="pswHeading">Admin Passwort</h1>');
    callback();
  },
  () => {
    function tryLogin() {
      adminKey = $("#adminPsw").val();
      apiRequest(
        "GET",
        "/api/orders",
        undefined,
        () => pageHandler.loadPage("Home"),
        () => {
          adminKey = "";
          $("#adminPsw").val("");
        }
      );
    }
    $("#adminPsw").keypress((e) => {
      if (e.which == 13) tryLogin();
    });
    $("#loginBtn").click(tryLogin);
  }
);

let home = new page(
  "home",
  (callback) => {
    if (sessionOpt) {
      $("#content").load("./UI/homeWithSession.html");
    } else {
      $("#content").load("./UI/home.html");
    }

    //try to fix this later
    setTimeout(() => {
      callback();
    }, 250);
  },
  () => {
    //check if New Session got clicked
    $("#Session").click(() => {
      //when clicked fade out all UI elements, load new UI elements and fade new UI elements in
      pageHandler.loadPage("Session");
    });
    //check if Ingredients got clicked
    $("#Ingredients").click(() => {
      //when clicked fade out all UI elements, load new UI elements and fade new UI elements in
      pageHandler.loadPage("Ingredients");
    });
    //check if New Options got clicked
    $("#Options").click(() => {
      //when load Options UI page
      pageHandler.loadPage("Options");
    });
    $("#ContinueSession").click(() => {
      pba.show();
      pageHandler.pageHistory = ["Home", "Session"];
      showOrders();
    });
    $("#EndSession").click(() => {
      apiRequest("DELETE", "/api/session", undefined, () => {
        sessionOpt = 0;
        pageHandler.loadPage("Home");
      });
    });
  }
);

let options = new page(
  "options",
  (callback) => {
    apiRequest("GET", "/api/menu", undefined, (data) => {
      (data.options || []).forEach((name) => {
        $("#content").append(`<p style="display: none;">${name}</p>`);
      });
    });
    $("#content").append('<a id="aNO">Add new Option</a>');
    $("#content").append('<a id="rO">Remove Option</a>');
    //try to fix this later
    setTimeout(() => {
      callback();
    }, 250);
  },
  () => {
    $("#aNO").click(() => {
      $("#content").removeClass("options");
      pageHandler.loadPage("addOption");
    });
    $("#rO").click(() => {
      $("#content").removeClass("options");
      pageHandler.loadPage("removeOption");
    });
  }
);

let addOption = new page(
  "addOption",
  (callback) => {
    $("#content").append('<input type="text" id="oI" style="display: none;">');
    setTimeout(() => {
      callback();
    }, 250);
  },
  () => {
    $("#oI").keypress((e) => {
      if (e.which == 13) {
        addMenuItem("option", $("#oI").val(), () => {
          $("#oI").val("");
          pageHandler.loadPage("Options");
        });
      }
    });
  }
);

let removeOption = new page(
  "removeOption",
  (callback) => {
    apiRequest("GET", "/api/menu", undefined, (data) => {
      const options = data.options || [];
      for (let i = 0; i < options.length; i++) {
        $("#content").append(
          `<p class="oTR ${i == 0 ? "tE" : ""}" style="display: none;">${
            options[i]
          }</p>`
        );
      }
      setTimeout(() => {
        callback();
      }, 250);
    });
  },
  () => {
    $("#content p").click((e) => {
      removeElement(e.target.innerHTML, "option");
      e.target.remove();
    });
  }
);

let ingredients = new page(
  "ingredients",
  (callback) => {
    apiRequest("GET", "/api/menu", undefined, (data) => {
      (data.ingredients || []).forEach((name) => {
        $("#content").append(`<p style="display: none;">${name}</p>`);
      });
    });
    $("#content").append('<a id="aNI">Add new Ingredient</a>');
    $("#content").append('<a id="rI">Remove Ingredient</a>');
    //try to fix this later
    setTimeout(() => {
      callback();
    }, 250);
  },
  () => {
    $("#aNI").click(() => {
      $("#content").removeClass("ingredients");
      pageHandler.loadPage("addIngredient");
    });
    $("#rI").click(() => {
      $("#content").removeClass("ingredients");
      pageHandler.loadPage("removeIngredient");
    });
  }
);

let addIngredient = new page(
  "addIngredient",
  (callback) => {
    $("#content").append('<input type="text" id="oI" style="display: none;">');
    setTimeout(() => {
      callback();
    }, 250);
  },
  () => {
    $("#oI").keypress((e) => {
      if (e.which == 13) {
        addMenuItem("ingredient", $("#oI").val(), () => {
          $("#oI").val("");
          pageHandler.loadPage("Ingredients");
        });
      }
    });
  }
);

let removeIngredient = new page(
  "removeIngredient",
  (callback) => {
    apiRequest("GET", "/api/menu", undefined, (data) => {
      const ingredients = data.ingredients || [];
      for (let i = 0; i < ingredients.length; i++) {
        $("#content").append(
          `<p class="iTR ${i == 0 ? "tE" : ""}" style="display: none;">${
            ingredients[i]
          }</p>`
        );
      }
      setTimeout(() => {
        callback();
      }, 250);
    });
  },
  () => {
    $("#content p").click((e) => {
      removeElement(e.target.innerHTML, "ingredient");
      e.target.remove();
    });
  }
);

let session = new page(
  "session",
  (callback) => {
    callback();
  },
  () => {
    selectSessionIngredients();
  }
);

$(document).ready(() => {
  pageHandler.onLoad();
});
