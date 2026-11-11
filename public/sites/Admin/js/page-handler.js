$.ajaxSetup({ cache: false });
class page_handler {
  constructor(options) {
    if (options.beforeLoad != undefined) this.beforeLoad = options.beforeLoad;
    if (options.afterLoadStandard != undefined)
      this.afterLoadStandard = options.afterLoadStandard;
    if (options.beforeUnload != undefined)
      this.beforeUnload = options.beforeUnload;
    if (options.arrowBackType != undefined)
      this.arrowBackType = options.arrowBackType;
    else this.arrowBackType = 0;
    this.pages = [];
    this.pageHistory = [];
  }
  newPage(name, ref) {
    this.pages.push({ name, ref });
  }
  loadPage(page, callback) {
    page = this.pages.find(
      (e) => e.name.toLowerCase() == page.toLowerCase()
    ).ref;
    this.currentPage = page.name;
    page.load(() => {
      this.pageHistory.push(page.name);
      callback ? callback() : "";
    });
  }
  onLoad() {
    if (pageHandler.arrowBackType) {
      $(".icon-back-div").click(() => {
        $(".icon-back-div").animate(
          {
            left: "-=75",
          },
          100,
          $.easie(0.5, 0.5, 1, 1.5),
          () => {
            $(".icon-back-div").hide();
            $(".icon-back-div").animate(
              {
                left: "+=75",
              },
              1
            );
            pageHandler.loadPage(
              pageHandler.pageHistory[pageHandler.pageHistory.length - 2]
            );
            pageHandler.pageHistory.splice(
              pageHandler.pageHistory.length - 2,
              pageHandler.pageHistory.length
            );
            $("#content").css("justify-content", "flex-start");
          }
        );
      });
    } else {
      $(".icon-back-div").click(() => {
        $(".icon-back-div").animate(
          {
            left: "-=25",
          },
          100,
          $.easie(0.5, 0.5, 1, 1.5)
        );
        $(".icon-back-div").animate(
          {
            left: "+=25",
          },
          100,
          $.easie(0.5, 0.5, 1, 1.5)
        );
        pageHandler.loadPage(
          pageHandler.pageHistory[pageHandler.pageHistory.length - 2]
        );
        pageHandler.pageHistory.splice(
          pageHandler.pageHistory.length - 2,
          pageHandler.pageHistory.length
        );
        $("#content").css("justify-content", "flex-start");
      });
    }
    $.getJSON("/api/session", (data) => {
      sessionOpt = data;
      if (sessionOpt) {
        pba.show();
        pageHandler.pageHistory = ["Home", "Session"];
        showOrders();
      } else {
        this.loadPage("login");
      }
    });
  }
}

let pageHandler = new page_handler({
  beforeLoad: (callback) => {
    $("#content").empty();
    stopOrdersPolling();
    callback();
  },
  afterLoadStandard: (callback) => {
    if (pageHandler.currentPage == "home") {
      pba.hide();
      pba.state = 0;
    } else {
      pba.show();
      pba.state = 1;
    }
    $("#content *").fadeIn();
    callback();
  },
  beforeUnload: () => {},
});

class page {
  constructor(name, whenLoad, afterLoad) {
    this.name = name;
    this.whenLoad = whenLoad;
    this.afterLoad = afterLoad;
    pageHandler.newPage(name, this);
  }
  load(callback) {
    console.log("Loading Page: " + this.name);
    pageHandler.beforeLoad(() => {
      console.log("BeforeLoad-Callback was fired");
      this.whenLoad(() => {
        console.log("WhenLoad-Callback was fired");
        pageHandler.afterLoadStandard(() => {
          console.log("AfterLoadStandard-Callback was fired");
          this.afterLoad();
          callback();
        });
      });
    });
  }
}

var pba = {
  show: () => $(".icon-back-div").fadeIn(),
  hide: () => $(".icon-back-div").fadeOut(),
}; //pba = page back arrow
