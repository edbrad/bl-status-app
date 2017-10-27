declare var pdfMake: any; /** prevent TypeScript typings error when using non-TypeSCript Lib (pdfmake) */
declare var moment: any;  /** prevent TypeScript typings error when using non-TypeSCript Lib (momentJS) */
// Angular 2/4 native libraries
import { Component, OnInit, OnDestroy, ViewEncapsulation, ViewChild } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subscription } from "rxjs/Subscription";
import 'rxjs/add/operator/map'

// 3rd-party/open-source components
import { DaterangepickerConfig } from 'ng2-daterangepicker';
import { DaterangePickerComponent } from 'ng2-daterangepicker';
import { ToastrService } from 'ngx-toastr';
import { SelectModule } from 'ng2-select';

// custom services
import { DataService } from '../data.service';
import { LoggingService } from '../logging.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  // misc variables
  public isDataLoaded: boolean = false;
  public isLineDataloaded: boolean = false;
  public isBarDataloaded: boolean = false;
  public isPieDataloaded: boolean = false;
  public logoImagePath: string = "../assets/EMS_Envelope_T.png";
  public filterText: string = null;
  public lastRefreshDate: any = moment();
  public pieceTypes: Array<string> = ['Letter', 'Flat', 'PC'];
  public statuses: Array<string> = ['New', 'In Process', 'Issue', 'Replacement', 'Complete'];
  public selectedFilterPieceType: string = null;
  public selectedFilterStatus: string = null;
  public isAccountingIssueChecked: boolean = false;  /** PostalAccouting Issue flag */
  public isAutoRefreshChecked: boolean = false;

  // Observable Subscriptions Array
  private subscriptions: Subscription[] = [];

  // ChartJS parameters (ng2-charts)
  /* line chart */
  public totalChartPieces: number = 0;
  public lineChartLegend: boolean = false;
  public lineChartType: string = 'line';
  public lineChartData: Array<any> = [
    { data: [0, 0, 0, 0, 0, 0, 0], label: 'Pieces' },
  ];
  public lineChartLabels: Array<any> = ['Today', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
  public lineChartOptions: any = {
    scaleShowVerticalLines: false,
    responsive: true
  };
  public lineChartColors: any[] = [
    {
      backgroundColor: ["#949fb1"]
    }];

  /* bar chart */
  public totalChartPatterns: number = 0;
  public barChartLabels: string[] = ['New', 'In Process', 'Issue', 'Complete'];
  public barChartType: string = 'bar';
  public barChartLegend: boolean = false;
  public barChartData: Array<any> = [
    { data: [1, 2, 3, 4],  label: 'Patterns' },
  ];
  public barChartColors: any[] = [{backgroundColor: ["#c1c1c1", "#337ab7", "#d9534f", "#7bc47b"]}];
  public barChartOptions: any = {
    scaleShowVerticalLines: false,
    responsive: true,
    scaleShowValues: true,
    scaleValuePaddingX: 5,
    scaleValuePaddingY: 5,
    animation: {
      onComplete: function () {
        var chartInstance = this.chart, ctx = chartInstance.ctx;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        this.data.datasets.forEach(function (dataset, i) {
          var meta = chartInstance.controller.getDatasetMeta(i);
          meta.data.forEach(function (bar, index) {
            var data = dataset.data[index];
            ctx.fillText(data, bar._model.x, bar._model.y - 0);
          });
        });
      }
    },
    scales: {
      yAxes: [
        {
          minimum: 0,
          display: false,
          ticks: {
            beginAtZero: false,
            stepSize: 0,
            fontSize: 14
         }
        }
      ],
      xAxes: [
        {
          minimum: 0,
          display: true,
          ticks: {
           beginAtZero: false,
           stepSize: 0,
           fontSize: 14
         }
      }
     ]
    }
  };

  /* pie chart */
  public totalPiePatterns: number = 0;
  public pieChartLabels: string[] = ['New', 'In Process', 'Issue', 'Complete'];
  public pieChartType: string = 'pie';
  public pieChartLegend: boolean = true;
  public pieChartData: Array<any> = [
    { data: [1, 2, 3, 4],  label: 'Patterns' },
  ];
  public pieChartColors: any[] = [{backgroundColor: ["#c1c1c1", "#337ab7", "#d9534f", "#7bc47b"]}];
  public pieChartOptions: any = {
    responsive: true,
    scaleShowValues: true,
    legend: {position: 'right'}
  }

  // datepicker - date range (ng2-daterangepicker) variables
  @ViewChild(DaterangePickerComponent)
  private picker: DaterangePickerComponent;
  public daterange: any = {};
  public selectedDate(value: any, datepicker?: any) {
    //console.log("date value: " + JSON.stringify(value));
    // save selected date range
    datepicker.start = value.start;
    datepicker.end = value.end;

    // manupulate internal date properties
    this.daterange.start = value.start;
    this.daterange.end = value.end;
    this.daterange.label = value.label;

    // refresh data (update UI)
    this.refreshStatusData();
  }

  // data-table variables (ngx-datatable)
  public rows: any[] = [];
  public temp = []
  public temp2 = [];
  public data = [];
  public expanded: any = {};
  public timeout: any;
  @ViewChild('homeTable') table: any; /** data table html reference */

  // job ticket (PDF) variables (pdfmake)
  public pdf: any;                 /** pointer to pdfmake javascript library */
  public company: string = "";
  public jobNumber: string = "";
  public job: any;                 /** the given job information array from the REST query */
  public aJob: any = {};
  public clients: any[] = [];      /** colection of all the Clients from the REST API */
  public aClient: any = {};        /** the client for the given Job (ACCESS data duplication work-around) */
  public aContact: any = {};       /** the specific Contact for the given Job (ACCESS data duplication work-around) */
  public jobPatterns: any[] = [];  /** the pattern details for the given Job */
  public totalQty: number = 0;     /** total pieces */

  /**
   * @constructor
   * @param ds data service dependency (makes REST API calls)
   * @param toastr pop-up notification dependency
   * @param logger logging service dependency
   * @param daterangepickerOptions Date Range Picker config
   */
  constructor(private ds: DataService,
    private toastr: ToastrService,
    private logger: LoggingService,
    private daterangepickerOptions: DaterangepickerConfig) {
    // initialize DatePicker (for drop date range filter)
    this.daterangepickerOptions.settings = {
      locale: { format: 'MM/DD/YY' },
      alwaysShowCalendars: false,
      ranges: {
        'Today': [moment(), moment()],
        'Next 7 Days': [moment(), moment().add(6, 'days')],
        'Next 30 Days': [moment(), moment().add(30, 'days')],
        'Last 30 Days': [moment().subtract(30, 'days'), moment()],
        'Last 3 Months': [moment().subtract(3, 'month'), moment()],
        'Last 6 Months': [moment().subtract(6, 'month'), moment()],
        'Last 12 Months': [moment().subtract(12, 'month'), moment()],
      },
      startDate:moment().format("MM/DD/YY"),
      endDate: moment().add(6, 'days').format("MM/DD/YY")
    };
  }

  /**
   * @method ngOnInit
   * @description initialize component
   */
  ngOnInit() {
    // set date range
    this.daterange.start = moment().format("MM/DD/YY");
    this.daterange.end = moment().add(6, 'days').format("MM/DD/YY");
    // get latest status data
    this.refreshStatusData();
    // log the event
    this.logger.addToLog("INFO", "Home Component activated.").subscribe((data => {
      const ack = data;
      if (!ack) {
        this.toastr.error('Logging Error!', 'bl-status: Logging Service');
      }
    }));

    // add auto-refresh initialization
    // TODO: use the suscriptions array for other Observables
    this.subscriptions.push(
      Observable.interval(1 * 1000 * 60).subscribe(x => {
        this.autoRefresh();
      })
    );
  }

  /**
   * @method autoRefresh
   * @desc Interval - auto-refresh data function
   */
  public autoRefresh(){
    if (this.isAutoRefreshChecked == true) {
      this.refreshStatusData();
      this.toastr.info('Data Auto-Refreshed...', 'bl-status: Data Service');
    }
  }


  /**
   * @method buildPieceChart
   * @description collect data for 7-day Piece Drop Chart
   */
  public buildPieceChart() {
    this.isLineDataloaded = false;

    // work variables
    var days: Array<any> = [];
    var dayLabels: Array<any> = [];
    var dayPieces: Array<any> = [];
    var pieces: Array<any> = [0, 0, 0, 0, 0, 0, 0];

    // get date range (7 days).
    days[0] = moment();
    days[1] = moment().add(1, 'days');
    days[2] = moment().add(2, 'days');
    days[3] = moment().add(3, 'days');
    days[4] = moment().add(4, 'days');
    days[5] = moment().add(5, 'days');
    days[6] = moment().add(6, 'days');

    // get patterns for each day in range
    this.totalChartPieces = 0
    for (var i = 0; i < 7; i++) {
      dayPieces = this.temp2.filter(function (d) {
        var momentA = moment(days[i]).format("MM/DD/YY");
        var momentB = moment(d.dropDate).format("MM/DD/YY");
        if (momentA == momentB) {
          return true;
        }
        else {
          return false;
        }
      });
      // tally piece amounts for each day
      for (var j = 0; j < dayPieces.length; j++) {
        pieces[i] += parseInt(dayPieces[j].total);
        this.totalChartPieces += parseInt(dayPieces[j].total);
      }
    }
    for (var k = 0; k < days.length; k++) {
      dayLabels[k] = moment(days[k]).format("MM/DD");
    }

    // apply data to chart
    this.lineChartData[0] = { data: pieces, label: "Piece Count" };
    this.lineChartLabels = dayLabels;
    //
    this.isLineDataloaded = true
  }

  /**
   * @method buildBarChart
   * @desc build dataset for bar chart
   */
  public buildBarChart() {
    this.isBarDataloaded = false;

    // work variables
    var statusDays: Array<any> = [];
    var statuses: Array<any> = [];
    var statusPatterns: Array<any> = [];
    var statusCounts: Array<any> = [];

    // set statuses
    statuses[0] = "New";
    statuses[1] = "In Process";
    statuses[2] = "Issue";
    statuses[3] = "Complete";

    // get date range (7 days).
    statusDays[0] = moment();
    statusDays[1] = moment().add(1, 'days');
    statusDays[2] = moment().add(2, 'days');
    statusDays[3] = moment().add(3, 'days');
    statusDays[4] = moment().add(4, 'days');
    statusDays[5] = moment().add(5, 'days');
    statusDays[6] = moment().add(6, 'days');

    // initialize status counts
    statusCounts[0] = 0;
    statusCounts[1] = 0;
    statusCounts[2] = 0;
    statusCounts[3] = 0;

    // get patterns for the days in range
    this.totalChartPatterns = 0;
    for (var i = 0; i < 7; i++) {
      statusPatterns = [];
      statusPatterns = this.temp2.filter(function (d) {
        var momentA = moment(statusDays[i]).format("MM/DD/YY");
        var momentB = moment(d.dropDate).format("MM/DD/YY");
        if (momentA == momentB) {
          return true;
        }
        else {
          return false;
        }
      });
      //console.log("Status Patterns: " + JSON.stringify(statusPatterns));
      // tally pattern amounts for each day
      for (var j = 0; j < statusPatterns.length; j++) {
        //console.log("each sampleStatus: " + statusPatterns[j].sampleStatus);
        //console.log("each paperworkStatus: " + statusPatterns[j].paperworkStatus);

        // New
        if ((statusPatterns[j].sampleStatus != "Issue") && (statusPatterns[j].paperworkStatus != "Issue")) {
          if ((statusPatterns[j].sampleStatus == statuses[0]) || (statusPatterns[j].paperworkStatus == statuses[0])) {
            statusCounts[0]++;
          }
        }

        // In Process
        if ((statusPatterns[j].sampleStatus != "Issue") && (statusPatterns[j].paperworkStatus != "Issue")) {
          if ((statusPatterns[j].sampleStatus == statuses[1]) || (statusPatterns[j].paperworkStatus == statuses[1])) {
            statusCounts[1]++;
          }
        }

        // Issue
        if((statusPatterns[j].sampleStatus == statuses[2]) || (statusPatterns[j].paperworkStatus == statuses[2])) {
          statusCounts[2]++;
        }

        // Complete
        if((statusPatterns[j].sampleStatus == statuses[3]) && (statusPatterns[j].paperworkStatus == statuses[3])) {
          statusCounts[3]++;
        }
      }
    }

    // load status counts
    this.barChartData[0].data[0] = statusCounts[0];
    this.barChartData[0].data[1] = statusCounts[1];
    this.barChartData[0].data[2] = statusCounts[2];
    this.barChartData[0].data[3] = statusCounts[3];

    // apply data to chart
    var sum = 0;
    for (var k = 0; k < statusCounts.length; k++) {
      sum += statusCounts[k];
    }
    this.totalChartPatterns = sum;

    // refresh/redraw chart
    this.barChartData = this.barChartData.slice();
    this.isBarDataloaded = true;
  }

  /**
   * @method buildPieChart
   * @desc build dataset for pie chart
   */
  public buildPieChart() {
    this.isPieDataloaded = false;

    // work variables
    var statusDays: Array<any> = [];
    var statuses: Array<any> = [];
    var statusPatterns: Array<any> = [];
    var tallyPatterns: Array<any> = [];
    var statusCounts: Array<any> = [];

    // get date range (7 days).
    statuses[0] = "New";
    statuses[1] = "In Process";
    statuses[2] = "Issue";
    statuses[3] = "Complete";

    // get date range (7 days).
    statusDays[0] = moment();
    statusDays[1] = moment().add(1, 'days');
    statusDays[2] = moment().add(2, 'days');
    statusDays[3] = moment().add(3, 'days');
    statusDays[4] = moment().add(4, 'days');
    statusDays[5] = moment().add(5, 'days');
    statusDays[6] = moment().add(6, 'days');

    // initialize status counts
    statusCounts[0] = 0;
    statusCounts[1] = 0;
    statusCounts[2] = 0;
    statusCounts[3] = 0;

    // get patterns for the days in range
    this.totalChartPatterns = 0;
    tallyPatterns = []
    for (var i = 0; i < 7; i++) {
      statusPatterns = [];
      statusPatterns = this.temp2.filter(function (d) {
        var momentA = moment(statusDays[i]).format("MM/DD/YY");
        var momentB = moment(d.dropDate).format("MM/DD/YY");
        if (momentA == momentB) {
          tallyPatterns.push(d.pattern);
          return true;
        }
        else {
          return false;
        }
      });
      //console.log("Status Patterns: " + JSON.stringify(statusPatterns));
      // tally pattern amounts for each day
      for (var j = 0; j < statusPatterns.length; j++) {
        //console.log("each sampleStatus: " + statusPatterns[j].sampleStatus);
        //console.log("each paperworkStatus: " + statusPatterns[j].paperworkStatus);

        // New
        if ((statusPatterns[j].sampleStatus != "Issue") && (statusPatterns[j].paperworkStatus != "Issue")) {
          if ((statusPatterns[j].sampleStatus == statuses[0]) || (statusPatterns[j].paperworkStatus == statuses[0])) {
            statusCounts[0]++;
          }
        }

        // In Process
        if ((statusPatterns[j].sampleStatus != "Issue") && (statusPatterns[j].paperworkStatus != "Issue")) {
          if ((statusPatterns[j].sampleStatus == statuses[1]) || (statusPatterns[j].paperworkStatus == statuses[1])) {
            statusCounts[1]++;
          }
        }

        // Issue
        if((statusPatterns[j].sampleStatus == statuses[2]) || (statusPatterns[j].paperworkStatus == statuses[2])) {
          statusCounts[2]++;
        }

        // Complete
        if((statusPatterns[j].sampleStatus == statuses[3]) && (statusPatterns[j].paperworkStatus == statuses[3])) {
          statusCounts[3]++;
        }
      }
    }

    // load status counts
    this.pieChartData[0].data[0] = statusCounts[0]; /** New */
    this.pieChartData[0].data[1] = statusCounts[1]; /** In Process */
    this.pieChartData[0].data[2] = statusCounts[2]; /** Issue */
    this.pieChartData[0].data[3] = statusCounts[3]; /** Complete */

    // apply data to chart
    var sum = 0;
    for (var k = 0; k < statusCounts.length; k++) {
      sum += statusCounts[k];
    }
    this.totalChartPatterns = tallyPatterns.length

    // refresh/redraw chart
    this.pieChartData = this.pieChartData.slice();
    this.isPieDataloaded = true;
  }

  /**
   * @method pieceTypeSelected
   * @desc apply piece type filter selection
   * @param {any} value the selected piece type filter value
   */
  public pieceTypeFilterSelected(value: any) {
    this.selectedFilterPieceType = value.text;
    this.refreshStatusData();
  }

  /**
   * @method pieceTypeRemoved
   * @desc remove piece type filter selection
   * @param {any} value
   */
  public pieceTypeFilterRemoved(value: any) {
    this.selectedFilterPieceType = null;
    this.refreshStatusData();
  }

  /**
   * @method statusSelected
   * @desc apply status filter selection
   * @param {any} value
   */
  public statusFilterSelected(value: any) {
    this.selectedFilterStatus = value.text;
    this.refreshStatusData();
  }

  /**
   * @method statusRemoved
   * @desc remove status filter selection
   * @param {any} value
   */
  public statusFilterRemoved(value: any) {
    this.selectedFilterStatus = null;
    this.refreshStatusData();
  }

  /**
   * @method isComplete
   * @description determine if all tasks are done (sample & paperwork)
   * @param {string} sampleStatus
   * @param {string} paperworkStatus
   * @returns {boolean} true/false
   */
  public isComplete(sampleStatus: string, paperworkStatus: string) {
    if (sampleStatus == "Complete" && paperworkStatus == "Complete") {
      return true;
    }
    else {
      return false;
    }
  }

  /**
   * @method updatePatternFilter
   * @description filter rows (patterns) as user types
   * @param {event} event key-up event from the filter field
   */
  public updatePatternFilter(event) {
    const val = event.target.value.toLowerCase();
    // filter our data
    const temp = this.temp.filter(function (d) {
      return d.pattern.toLowerCase().indexOf(val) !== -1 || !val;
    });

    // refresh data (Update UI)
    this.refreshStatusData();

    // whenever the filter changes, always go back to the first page
    this.table.offset = 0;
  }

  /**
   * @method refreshStatusData
   * @description get latest status data from the database and apply any
   * existing filters
   */
  public refreshStatusData() {
    // get all statuses from the external REST API
    var textFilter: any[] = [];     /* Text Box filter data bucket */
    var dateFilter: any[] = [];     /* Drop Date Range filter data bucket */
    var pieceFilter: any[] = [];    /* Piece Type filter data bucket */
    var statusFilter: any[] = [];   /* Status filter data bucket */
    var pieceType: string = null;   /* selected piece type (letter/flat) filter */
    var status: string = null;      /* selected status filter */
    // show loading indicator
    this.isDataLoaded = false;
    this.ds.getAllStatuses().subscribe((data => {
      // clear loading indicator
      this.isDataLoaded = true;
      // save data from database
      this.rows = data;
      // cache data for datatable filtering & charting
      this.temp = [...data];    /** datatable */
      this.temp2 = [...data];   /** charting */

      // filter pattern code
      if (this.filterText != null) {
        const val = this.filterText.toLocaleLowerCase();
        textFilter = this.temp.filter(function (d) {
          return d.pattern.toLowerCase().indexOf(val) !== -1 || !val;
        });
      }
      else {
        // pass-through - no filter text entered
        textFilter = [...this.temp];
      }

      // filter drop date range
      /** update the start date if the current day has changed */
      if (this.daterange.start){
        if (!this.lastRefreshDate.isSame(moment(), 'd')){
          this.daterange.start = moment();
          this.daterange.end = moment().add(6, 'days');
        }
      }

      if (this.daterange.start && this.daterange.end) {
        var s = this.daterange.start;
        var e = this.daterange.end;
        //console.log("filter date start: " + this.daterange.start);
        //console.log("filter date end: " + this.daterange.end);
        dateFilter = textFilter.filter(function (d) {
          var date = moment(d.dropDate, "MM/DD/YY");
          var startDate = moment(s, "MM/DD/YY");
          var endDate = moment(e, "MM/DD/YY");
          if (date.isBefore(endDate)
            && date.isAfter(startDate)
            || (date.isSame(startDate) || date.isSame(endDate))) {
            return true;
          } else {
            return false;
          }
        });
      }
      else {
        // pass-through - no drop date range selected
        dateFilter = [...textFilter]
      }

      // filter piece type
      if (this.selectedFilterPieceType) {
        //console.log("filter piece type: " + this.selectedFilterPieceType);
        pieceType = this.selectedFilterPieceType;
        pieceFilter = dateFilter.filter(function (d) {
          if (d.type == pieceType) {
            return true;
          }
          else {
            return false;
          }
        });
      }
      else {
        // pass-through - no piece type filter selected
        pieceFilter = [...dateFilter]
      }

      // filter status
      if (this.selectedFilterStatus) {
        //console.log("filter status: " + this.selectedFilterStatus);
        status = this.selectedFilterStatus
        statusFilter = pieceFilter.filter(function (d) {
          if (status == "Complete") {
            /* both sample and paperwork have to be complete to be considered "Complete" */
            if (d.sampleStatus == status && d.paperworkStatus == status) {
              return true;
            }
            else {
              return false;
            }
          }
          else {
            /* for other statuses (In Process, Issue, etc..), either sample or paperwork can be
            a match to be considered the given status */
            if (d.sampleStatus == status || d.paperworkStatus == status) {
              return true;
            }
            else {
              return false;
            }
          }
        });
      }
      else {
        // pass-through - no status filter selected
        statusFilter = [...pieceFilter]
      }

      // finally, update the rows to be displayed
      this.rows = statusFilter;

      // whenever the filter changes, always go back to the first page
      this.table.offset = 0;

      // update last refresh time display
      this.lastRefreshDate = moment();

      // build chart data
      this.buildPieceChart();
      //this.buildBarChart();
      this.buildPieChart();
    }));
  }

  /**
   * @method onPage
   * @description capture data-table paging events
   * @param {event} event
   */
  public onPage(event) {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
    }, 100);
  }

  /**
   * @method toggleExpandRow
   * @description toggle selected row detail view open and closed
   * @param {any} row the selected row
   */
  public toggleExpandRow(row: any) {
    this.table.rowDetail.toggleExpandRow(row);
  }

  /**
   * @method onDetailToggle
   * @description capture row detail toggle event
   * @param {event} event the given toggle even
   */
  public onDetailToggle(event) {
    // TODO:???
  }

  /**
   * @method printJobTicket
   * @description generate a PDF of the EMS Job Ticket (using pdfMake Library)
   * @param {string} pattern the given pattern
   */
  private printJobTicket(pattern: string) {
    this.aClient = "sample";
    // trim off pattern code ( = Job Number)
    this.jobNumber = pattern.substring(0, pattern.length - 1);
    this.pdf = pdfMake;

    /** get a job from the external REST API */
    this.ds.getAJob(this.jobNumber).subscribe((data => {
      // skip generation processing if there is no Job Ticket data
      if (data.length == 0) {
        this.toastr.error('Job Ticket Not Found!', 'bl-status: Data Service');
        // log the event
        this.logger.addToLog("ERROR", "Job Ticket Print Failure - Job Ticket Not Found: " + this.jobNumber).subscribe((data => {
          const ack = data;
          if (!ack) {
            this.toastr.error('Logging Error!', 'bl-status: Logging Service');
          }
        }));
        return;
      }

      this.job = data;
      this.aJob = this.job[0];
      this.company = this.job[0].Company;

      /** get corresponding company/contact information */
      this.ds.getClients().subscribe((data => {
        this.clients = data;
        this.aClient = this.clients.find(client => client.Comp === this.company);
        this.aContact = this.clients.find(client => client.Contact === this.aJob.Contact);
      }));

      /** get corresponding Patterns and tally/compute total Job quantity */
      this.ds.getJobDetails(this.jobNumber).subscribe((data => {
        this.jobPatterns = data;
        this.totalQty = 0;
        for (var i = 0; i < this.jobPatterns.length; i++) {
          this.totalQty += parseInt(this.jobPatterns[i].PackShip);
          this.totalQty += parseInt(this.jobPatterns[i].cbas);
          this.totalQty += parseInt(this.jobPatterns[i].cpre);
          this.totalQty += parseInt(this.jobPatterns[i].ccrt);
          this.totalQty += parseInt(this.jobPatterns[i].cwalk125);
          this.totalQty += parseInt(this.jobPatterns[i].csat);
          this.totalQty += parseInt(this.jobPatterns[i].cbasbar);
          this.totalQty += parseInt(this.jobPatterns[i].cdig3bar);
          this.totalQty += parseInt(this.jobPatterns[i].cdig5bar);
          this.totalQty += parseInt(this.jobPatterns[i].caadc);
          this.totalQty += parseInt(this.jobPatterns[i].cmaadc);
          this.totalQty += parseInt(this.jobPatterns[i].cbas3dig);
          this.totalQty += parseInt(this.jobPatterns[i].foreign);
          this.totalQty += parseInt(this.jobPatterns[i].canadian);
        }
        this.pdf.createPdf(this.buildJobTicketPdf(this.company, this.jobNumber, this.aJob)).open();
        // log the event
        this.logger.addToLog("INFO", "Job Ticket Print: " + this.jobNumber).subscribe((data => {
          const ack = data;
          if (!ack) {
            this.toastr.error('Logging Error!', 'bl-status: Logging Service');
          }
        }));
      }));
    }));
  }

  /**
   * @method buildJobTicketPdf
   * @description build dynamic Job Ticket PDF layout object for the pdfMake rendering method (createPdf)
   * @param {string} company - the given Company name (for Header/Footer dynamic content)
   * @param {string} jobNumber - the given Job Number (for Header/Footer dynamic content)
   * @param {any} aJob - the given Job information object (for Header/Footer dynamic content)
   * @returns a document definition object describing the PDF to be generated by the pdfMake library
   */
  private buildJobTicketPdf(company: string, jobNumber: string, aJob: any) {
    var docDefinition = {

      // Page Layout
      pageSize: 'LETTER',
      pageOrientation: 'portrait',

      // PDF Metadata
      info: {
        title: 'Executive Mailing Service Job Ticket - Job Number ' + this.jobNumber,
        author: 'Executive Mailing Service - Edward Bradley',
        subject: 'Executive Mailing Service Job Ticket PDF',
        keywords: 'EMS Job Ticket'
      },

      // Page Header
      /** in order to capture page number & count values, the header must be specified as a function */
      header: function (currentPage, pageCount) {
        return [
          {
            columns: [
              {
                text: company + ' - ' + jobNumber + ' UNOFFICIAL' +
                '\ngen: ' + moment().format('MMMM Do YYYY, h:mm:ss a'), alignment: 'left', margin: [40, 8, 30, 3], fontSize: 8
              },
              { text: 'JOB TICKET', bold: true, alignment: 'center', margin: [40, 8, 30, 3], fontSize: 18 },
              {
                text: 'Job Ticket Date: ' + moment(aJob.JobTicketDate).format('l') +
                '\nPAGE: ' + currentPage + ' OF ' + pageCount, alignment: 'right', margin: [40, 8, 30, 3], fontSize: 8, bold: true
              }
            ]
          }
        ]
      },

      // Page Body
      content: [
        {
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 5,
              x2: 543,
              y2: 5,
              lineWidth: 0.5
            }]
        },
        {
          columns: [
            {
              width: '60%',
              margin: [0, 20, 30, 3],
              stack: [
                { text: this.aContact.Contact + ': ' + this.formatUsPhone(this.aContact.phone), style: 'bold' },
                { text: this.aContact.Comp },
                { text: this.aContact.Add1 },
                { text: this.aContact.Add2 },
                { text: this.aContact.City + ', ' + this.aContact.state + ' ' + this.formatUsZipCode(this.aContact.zip) }
              ]
            },
            {
              width: '25%',
              margin: [0, 20, 30, 3],
              stack: [
                { text: 'Job Number: ' },
                { text: 'Date Received: ' },
                { text: 'Drop Date: ' },
                { text: '- To: ' }
              ]
            },
            {
              width: '15%',
              margin: [0, 20, 30, 3],
              stack: [
                { text: this.jobNumber, style: 'bold' },
                { text: moment(this.aJob.DateReceived).format('l'), style: 'bold' },
                { text: this.aJob.DropDate, style: 'bold' },
                { text: (this.aJob.ToDropDate != null) ? this.aJob.ToDropDate : '-', style: 'bold' }
              ]
            }
          ]
        },
        { text: ' ' },
        {
          table: {
            headerRows: 0,
            widths: ['25%', '75%'],
            body: this.buildJobTicketBody()
          },
        },
        { text: ' ' },
        { text: 'PATTERN DETAILS: ', bold: true, fontSize: 14 },
        { text: ' ' },
        {
          table: {
            headerRows: 0,
            widths: ['15%', '85%'],
            body: this.buildPatternBody()
          },
          layout: 'noBorders'
        },
        { text: '\nDEPARTMENTAL INSTRUCTIONS: ', style: 'bold', fontSize: 14 },
        { text: ' ' },
        {
          table: {
            headerRows: 0,
            widths: ['25%', '75%'],
            body: this.buildDepartmentBody()
          }
        },
        {
          text: [
            { text: '\nSales / CSR / Date:  ', fontSize: 9, italics: true },
            { text: this.aJob.Remark, fontSize: 9, italics: true, bold: true }
          ]
        }
      ],

      // Page Footer
      /** in order to capture page number & count values, the header must be specified as a function */
      footer: function (currentPage, pageCount) {
        return [
          {
            columns: [
              {
                text: 'MailEXEC - bl-status - Version 0.00' +
                '\ngen: ' + moment().format('MMMM Do YYYY, h:mm:ss a'), alignment: 'left', margin: [40, 8, 30, 3], fontSize: 8
              },
              { text: '2017 - Executive Mailing Service', alignment: 'center', margin: [40, 8, 30, 3], fontSize: 8 },
              { text: 'PAGE: ' + currentPage + ' OF ' + pageCount, alignment: 'right', margin: [40, 8, 30, 3], fontSize: 8, bold: true }
            ]
          },
        ]
      },
      styles: {
        bold: { bold: true }
      }
    };

    // Done
    return docDefinition;
  }

  /**
   * @method buildJobTicketBody
   * @description build dynamic Job Ticket PDF layout object
   * @returns {array} a collection of dynamic PDF layout parameters
   */
  private buildJobTicketBody() {
    var body = [];              /** storage for the layout parameters */

    body.push([{ text: 'Job Description:', style: 'bold' }, { text: this.aJob.JobDescp, style: 'bold' }]);
    body.push([{ text: 'Permit:', style: 'bold' }, this.aJob.Permit]);
    body.push([{ text: 'Postage:', style: 'bold' }, this.aJob.PostageBy]);
    body.push([{ text: 'Special Info:', style: 'bold' }, { text: this.aJob.MeterInst, style: 'bold' }]);
    body.push([{ text: 'Receiving Dept.:', style: 'bold' }, this.aJob.RDept]);
    body.push([{ text: 'Samples:', style: 'bold' }, this.aJob.Sample1]);
    if (this.aJob.Sample2 != null) { body.push([{ text: ' ' }, this.aJob.Sample2]); };
    if (this.aJob.Sample3 != null) { body.push([{ text: ' ' }, this.aJob.Sample3]); };
    if (this.aJob.Sample4 != null) { body.push([{ text: ' ' }, this.aJob.Sample4]); };
    if (this.aJob.Sample5 != null) { body.push([{ text: ' ' }, this.aJob.Sample5]); };
    if (this.aJob.Sample6 != null) { body.push([{ text: ' ' }, this.aJob.Sample6]); };
    if (this.aJob.Sample7 != null) { body.push([{ text: ' ' }, this.aJob.Sample7]); };
    if (this.aJob.Sample8 != null) { body.push([{ text: ' ' }, this.aJob.Sample8]); };
    if (this.aJob.Sample9 != null) { body.push([{ text: ' ' }, this.aJob.Sample9]); };
    if (this.aJob.Sample10 != null) { body.push([{ text: ' ' }, this.aJob.Sample10]); };
    if (this.aJob.Sample11 != null) { body.push([{ text: ' ' }, this.aJob.Sample11]); };
    if (this.aJob.Sample12 != null) { body.push([{ text: ' ' }, this.aJob.Sample12]); };
    if (this.aJob.Sample13 != null) { body.push([{ text: ' ' }, this.aJob.Sample13]); };
    if (this.aJob.Sample14 != null) { body.push([{ text: ' ' }, this.aJob.Sample14]); };
    if (this.aJob.Sample15 != null) { body.push([{ text: ' ' }, this.aJob.Sample15]); };
    if (this.aJob.Sample16 != null) { body.push([{ text: ' ' }, this.aJob.Sample16]); };
    if (this.aJob.Sample17 != null) { body.push([{ text: ' ' }, this.aJob.Sample17]); };
    if (this.aJob.Sample18 != null) { body.push([{ text: ' ' }, this.aJob.Sample18]); };
    if (this.aJob.Sample19 != null) { body.push([{ text: ' ' }, this.aJob.Sample19]); };
    if (this.aJob.Sample20 != null) { body.push([{ text: ' ' }, this.aJob.Sample20]); };
    if (this.aJob.Sample21 != null) { body.push([{ text: ' ' }, this.aJob.Sample21]); };
    if (this.aJob.Sample22 != null) { body.push([{ text: ' ' }, this.aJob.Sample22]); };
    body.push([{ text: 'TOTAL JOB PIECES:', style: 'bold', fontSize: 12 }, { text: this.addCommas(this.totalQty), style: 'bold', fontSize: 12 }]);

    // Done
    return body;
  }

  /**
   * @method buildPatternBody
   * @returns {array} a collection of dynamic PDF layout parameters
   */
  private buildPatternBody() {
    var body = [];              /** storage for the layout parameters */

    for (var i = 0; i < this.jobPatterns.length; i++) {
      body.push([{ text: 'Pattern ' + this.jobPatterns[i].Jobpat.toUpperCase() + ':', style: 'bold' },
      { text: this.jobPatterns[i].MailClass + ', ' + this.jobPatterns[i].Payment, style: 'bold' }]);
      if (this.jobPatterns[i].DESCP1 != null) { body.push([{ text: ' ' }, { text: this.jobPatterns[i].DESCP1 }]); };
      if (this.jobPatterns[i].DESCP2 != null) { body.push([{ text: ' ' }, { text: this.jobPatterns[i].DESCP2 }]); };
      if (this.jobPatterns[i].DESCP3 != null) { body.push([{ text: ' ' }, { text: this.jobPatterns[i].DESCP3 }]); };
      if (this.jobPatterns[i].DESCP4 != null) { body.push([{ text: ' ' }, { text: this.jobPatterns[i].DESCP4 }]); };
      if (this.jobPatterns[i].DESCP5 != null) { body.push([{ text: ' ' }, { text: this.jobPatterns[i].DESCP5 }]); };
      if (this.jobPatterns[i].DESCP6 != null) { body.push([{ text: ' ' }, { text: this.jobPatterns[i].DESCP6 }]); };
      body.push([{ text: ' ' }, { text: ' ' }]);

      // Domestic counts
      if (this.jobPatterns[i].cdig5bar != 0 ||
        this.jobPatterns[i].cbasbar != 0 ||
        this.jobPatterns[i].PackShip != 0 ||
        this.jobPatterns[i].cbas != 0 ||
        this.jobPatterns[i].cpre != 0 ||
        this.jobPatterns[i].ccrt != 0 ||
        this.jobPatterns[i].cwalk125 != 0 ||
        this.jobPatterns[i].csat != 0 ||
        this.jobPatterns[i].cbasbar != 0 ||
        this.jobPatterns[i].cdig3bar != 0 ||
        this.jobPatterns[i].cdig5bar != 0 ||
        this.jobPatterns[i].caadc != 0 ||
        this.jobPatterns[i].cmaadc != 0 ||
        this.jobPatterns[i].cbas3dig != 0) {
        body.push([{ text: ' ' }, { text: 'DOMESTIC POSTAL COUNTS:', style: 'bold', fontSize: 11 }]);
        body.push([{ text: ' ' }, {
          table: {
            widths: ['38%', '12%', '38%', '12%'],
            body: [
              [
                { text: '5-Digit Auto:', bold: (this.jobPatterns[i].cdig5bar > 0) ? true : false }, { text: this.addCommas(this.jobPatterns[i].cdig5bar), bold: (this.jobPatterns[i].cdig5bar > 0) ? true : false },
                { text: 'Machinable 5-Digit:', bold: (this.jobPatterns[i].cbasbar > 0) ? true : false }, { text: this.addCommas(this.jobPatterns[i].cbasbar), bold: (this.jobPatterns[i].cbasbar > 0) ? true : false }
              ],
              [
                { text: '3-Digit Auto:', bold: (this.jobPatterns[i].cdig3bar > 0) ? true : false }, { text: this.addCommas(this.jobPatterns[i].cdig3bar), bold: (this.jobPatterns[i].cdig3bar > 0) ? true : false },
                { text: 'Machinable 3-digit:', bold: (this.jobPatterns[i].cbas3dig > 0) ? true : false }, { text: this.addCommas(this.jobPatterns[i].cbas3dig), bold: (this.jobPatterns[i].cbas3dig > 0) ? true : false }
              ],
              [
                { text: 'Automated ADC/AADC:', bold: (this.jobPatterns[i].caadc > 0) ? true : false }, { text: this.addCommas(this.jobPatterns[i].caadc), bold: (this.jobPatterns[i].caadc > 0) ? true : false },
                { text: 'Machinable ADC/AADC:', bold: (this.jobPatterns[i].cpre > 0) ? true : false }, { text: this.addCommas(this.jobPatterns[i].cpre), bold: (this.jobPatterns[i].cpre > 0) ? true : false }
              ],
              [
                { text: 'Automated MADC/MAADC:', bold: (this.jobPatterns[i].cmaadc > 0) ? true : false }, { text: this.addCommas(this.jobPatterns[i].cmaadc), bold: (this.jobPatterns[i].cmaadc > 0) ? true : false },
                { text: 'Machinable MADC/MAADC:', bold: (this.jobPatterns[i].cbas > 0) ? true : false }, { text: this.addCommas(this.jobPatterns[i].cbas), bold: (this.jobPatterns[i].cbas > 0) ? true : false }
              ],
              [
                { text: 'High Density Enhanced CAR-RT: ', bold: (this.jobPatterns[i].cwalk125 > 0) ? true : false }, { text: this.addCommas(this.jobPatterns[i].cwalk125), bold: (this.jobPatterns[i].cwalk125 > 0) ? true : false },
                { text: 'Basic CAR-RT:', bold: (this.jobPatterns[i].ccrt > 0) ? true : false }, { text: this.addCommas(this.jobPatterns[i].ccrt), bold: (this.jobPatterns[i].ccrt) ? true : false }
              ],
              [
                { text: 'Saturation Enhanced CAR-RT: ', bold: (this.jobPatterns[i].csat > 0) ? true : false }, { text: this.addCommas(this.jobPatterns[i].csat), bold: (this.jobPatterns[i].csat > 0) ? true : false },
                { text: 'Pack and Ship/Estimate:', bold: (this.jobPatterns[i].PackShip > 0) ? true : false }, { text: this.addCommas(this.jobPatterns[i].PackShip), bold: (this.jobPatterns[i].PackShip > 0) ? true : false }
              ],
            ]
          },
          fontSize: 10
        }]);
      };

      // Foreign counts
      if (this.jobPatterns[i].foreign != 0 || this.jobPatterns[i].canadian != 0) {
        body.push([{ text: ' ' }, { text: 'FOREIGN PIECE COUNTS:', style: 'bold', fontSize: 11 }]);
        body.push([{ text: ' ' }, {
          table: {
            widths: ['40%', '60%'],
            body: [
              [
                { text: 'Canadian:', bold: (this.jobPatterns[i].canadian > 0) ? true : false },
                { text: this.addCommas(this.jobPatterns[i].canadian), bold: (this.jobPatterns[i].canadian > 0) ? true : false }
              ],
              [
                { text: 'Other Foreign:', bold: (this.jobPatterns[i].foreign > 0) ? true : false },
                { text: this.addCommas(this.jobPatterns[i].foreign), bold: (this.jobPatterns[i].foreign > 0) ? true : false }
              ]
            ]
          },
          fontSize: 10
        }]);
      };
      body.push([{ text: ' ' }, { text: 'TOTAL PATTERN PIECES:    ' + this.addCommas(this.getPatQty(this.jobPatterns[i].Jobpat)), alignment: 'right', style: 'bold', fontSize: 12 }]);
      body.push([{ text: ' ' }, { text: 'MAIL-PIECE COMPONENTS:', style: 'bold', fontSize: 11 }]);
      body.push([{ text: ' ' }, {
        table: {
          headerRows: 0,
          widths: ['10%', '2%', '15%', '8%', '32%', '33%'],
          body: this.buildMailPieceBody(this.jobPatterns[i])
        },
        layout: 'lightHorizontalLines',
        fontSize: 10
      }]);
      body.push([{ text: ' ' }, { text: ' ' }]);
      body.push([
        {
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 5,
              x2: 543,
              y2: 5,
              lineWidth: 0.5
            }], colSpan: 2
        }
      ]);
    }
    // Done
    return body;
  }

  /**
   * @method buildDepartmentBody
   * @description build Departmental instuction table
   * @returns {array} a collection of dynamic PDF layout parameters
   */
  private buildDepartmentBody() {
    var body = [];              /** storage for the layout parameters */

    body.push([{ text: 'Excess Stock:', style: 'bold' }, this.aJob.stockInst]);
    body.push([{ text: 'DP/Imaging:', style: 'bold' }, this.aJob.CRInst]);
    body.push([{ text: 'Inkjet Dept.:', style: 'bold' }, this.aJob.AdDept]);
    body.push([{ text: 'Bindery Dept.:', style: 'bold' }, this.aJob.BDInst]);
    body.push([{ text: 'Stamp Dept.:', style: 'bold' }, this.aJob.StampInst]);
    body.push([{ text: 'Inserting Dept.:', style: 'bold' }, this.aJob.InDInst]);
    body.push([{ text: 'Postage Statements:', style: 'bold' }, this.aJob.PO3602Inst]);
    //body.push([{ text: 'Salesperson/CSR:', style: 'bold' }, this.aJob.Remark]);

    // Done
    return body;
  }

  /**
   * @method buildMailPieceBody
   * @description dynamically build an array containing the data to be displayed in
   * the Mail Piece Component table section
   * @param {any} pat - Pattern/Details object to be formatted as part of the PDF
   * @returns {array} a collection of dynamic PDF layout parameters
   */
  private buildMailPieceBody(pat: any) {
    var body = [];                /** storage for the layout parameters */
    var ord: number = 1;          /** the insertion order */

    // optional outer envelope
    if (pat.OuterName != null || pat.OuterCode != null || pat.OuterNote != null) {
      body.push([
        { text: 'Outer:', style: 'bold' },
        { text: ord, style: 'bold' },
        { text: pat.OuterName },
        { text: 'Code:', style: 'bold' },
        { text: pat.OuterCode },
        { text: pat.OuterNote }
      ]);
      ord += 1;
    };

    // optional Postcard
    if (pat.PostName1 != null || pat.PostCode1 != null || pat.PostNote1 != null) {
      body.push([
        { text: 'Postcard:', style: 'bold' },
        { text: ord, style: 'bold' },
        { text: pat.PostName1 },
        { text: 'Code:', style: 'bold' },
        { text: pat.PostCode1 },
        { text: pat.PostNote1 }
      ]);
      ord += 1;
    }

    // inserts (currently 25 maximum)
    if (pat.Insert1Name != null || pat.Insert1Code != null || pat.Insert1Note != null) {
      body.push([
        { text: 'Inserts:', style: 'bold' },
        { text: ord, style: 'bold' },
        { text: pat.Insert1Name },
        { text: 'Code:', style: 'bold' },
        { text: pat.Insert1Code },
        { text: pat.Insert1Note }
      ]);
      ord += 1;
    }
    if (pat.Insert2Name != null || pat.Insert2Code != null || pat.Insert2Note != null) {
      body.push([
        { text: ' ', style: 'bold' },
        { text: ord, style: 'bold' },
        { text: pat.Insert2Name },
        { text: ' ', style: 'bold' },
        { text: pat.Insert2Code },
        { text: pat.Insert2Note }
      ]);
      ord += 1;
    }
    if (pat.Insert3Name != null || pat.Insert3Code != null || pat.Insert3Note != null) {
      body.push([
        { text: ' ', style: 'bold' },
        { text: ord, style: 'bold' },
        { text: pat.Insert3Name },
        { text: ' ', style: 'bold' },
        { text: pat.Insert3Code },
        { text: pat.Insert3Note }
      ]);
      ord += 1;
    }
    if (pat.Insert4Name != null || pat.Insert4Code != null || pat.Insert4Note != null) {
      body.push([
        { text: ' ', style: 'bold' },
        { text: ord, style: 'bold' },
        { text: pat.Insert4Name },
        { text: ' ', style: 'bold' },
        { text: pat.Insert4Code },
        { text: pat.Insert4Note }
      ]);
      ord += 1;
    }
    if (pat.Insert5Name != null || pat.Insert5Code != null || pat.Insert5Note != null) {
      body.push([
        { text: ' ', style: 'bold' },
        { text: ord, style: 'bold' },
        { text: pat.Insert5Name },
        { text: ' ', style: 'bold' },
        { text: pat.Insert5Code },
        { text: pat.Insert5Note }
      ]);
      ord += 1;
    }
    if (pat.Insert6Name != null || pat.Insert6Code != null || pat.Insert6Note != null) {
      body.push([
        { text: ' ', style: 'bold' },
        { text: ord, style: 'bold' },
        { text: pat.Insert6Name },
        { text: ' ', style: 'bold' },
        { text: pat.Insert6Code },
        { text: pat.Insert6Note }
      ]);
      ord += 1;
    }
    if (pat.Insert7Name != null || pat.Insert7Code != null || pat.Insert7Note != null) {
      body.push([
        { text: ' ', style: 'bold' },
        { text: ord, style: 'bold' },
        { text: pat.Insert7Name },
        { text: ' ', style: 'bold' },
        { text: pat.Insert7Code },
        { text: pat.Insert7Note }
      ]);
      ord += 1;
    }
    if (pat.Insert8Name != null || pat.Insert8Code != null || pat.Insert8Note != null) {
      body.push([
        { text: ' ', style: 'bold' },
        { text: ord, style: 'bold' },
        { text: pat.Insert8Name },
        { text: ' ', style: 'bold' },
        { text: pat.Insert8Code },
        { text: pat.Insert8Note }
      ]);
      ord += 1;
    }
    if (pat.Insert9Name != null || pat.Insert9Code != null || pat.Insert9Note != null) {
      body.push([
        { text: ' ', style: 'bold' },
        { text: ord, style: 'bold' },
        { text: pat.Insert9Name },
        { text: ' ', style: 'bold' },
        { text: pat.Insert9Code },
        { text: pat.Insert9Note }
      ]);
      ord += 1;
    }
    if (pat.Insert10Name != null || pat.Insert10Code != null || pat.Insert10Note != null) {
      body.push([
        { text: ' ', style: 'bold' },
        { text: ord, style: 'bold' },
        { text: pat.Insert10Name },
        { text: ' ', style: 'bold' },
        { text: pat.Insert10Code },
        { text: pat.Insert10Note }
      ]);
      ord += 1;
    }
    if (pat.Insert11Name != null || pat.Insert11Code != null || pat.Insert11Note != null) {
      body.push([
        { text: ' ', style: 'bold' },
        { text: ord, style: 'bold' },
        { text: pat.Insert11Name },
        { text: ' ', style: 'bold' },
        { text: pat.Insert11Code },
        { text: pat.Insert11Note }
      ]);
      ord += 1;
    }
    if (pat.Insert12Name != null || pat.Insert12Code != null || pat.Insert12Note != null) {
      body.push([
        { text: ' ', style: 'bold' },
        { text: ord, style: 'bold' },
        { text: pat.Insert12Name },
        { text: ' ', style: 'bold' },
        { text: pat.Insert12Code },
        { text: pat.Insert12Note }
      ]);
      ord += 1;
    }
    if (pat.Insert13Name != null || pat.Insert13Code != null || pat.Insert13Note != null) {
      body.push([
        { text: ' ', style: 'bold' },
        { text: ord, style: 'bold' },
        { text: pat.Insert13Name },
        { text: ' ', style: 'bold' },
        { text: pat.Insert13Code },
        { text: pat.Insert13Note }
      ]);
      ord += 1;
    }
    if (pat.Insert14Name != null || pat.Insert14Code != null || pat.Insert14Note != null) {
      body.push([
        { text: ' ', style: 'bold' },
        { text: ord, style: 'bold' },
        { text: pat.Insert14Name },
        { text: ' ', style: 'bold' },
        { text: pat.Insert14Code },
        { text: pat.Insert14Note }
      ]);
      ord += 1;
    }
    if (pat.Insert15Name != null || pat.Insert15Code != null || pat.Insert15Note != null) {
      body.push([
        { text: ' ', style: 'bold' },
        { text: ord, style: 'bold' },
        { text: pat.Insert15Name },
        { text: ' ', style: 'bold' },
        { text: pat.Insert15Code },
        { text: pat.Insert15Note }
      ]);
      ord += 1;
    }
    if (pat.Insert16Name != null || pat.Insert16Code != null || pat.Insert16Note != null) {
      body.push([
        { text: ' ', style: 'bold' },
        { text: ord, style: 'bold' },
        { text: pat.Insert16Name },
        { text: ' ', style: 'bold' },
        { text: pat.Insert16Code },
        { text: pat.Insert16Note }
      ]);
      ord += 1;
    }
    if (pat.Insert17Name != null || pat.Insert17Code != null || pat.Insert17Note != null) {
      body.push([
        { text: ' ', style: 'bold' },
        { text: ord, style: 'bold' },
        { text: pat.Insert17Name },
        { text: ' ', style: 'bold' },
        { text: pat.Insert17Code },
        { text: pat.Insert17Note }
      ]);
      ord += 1;
    }
    if (pat.Insert18Name != null || pat.Insert18Code != null || pat.Insert18Note != null) {
      body.push([
        { text: ' ', style: 'bold' },
        { text: ord, style: 'bold' },
        { text: pat.Insert18Name },
        { text: ' ', style: 'bold' },
        { text: pat.Insert18Code },
        { text: pat.Insert18Note }
      ]);
      ord += 1;
    }
    if (pat.Insert19Name != null || pat.Insert19Code != null || pat.Insert19Note != null) {
      body.push([
        { text: ' ', style: 'bold' },
        { text: ord, style: 'bold' },
        { text: pat.Insert19Name },
        { text: ' ', style: 'bold' },
        { text: pat.Insert19Code },
        { text: pat.Insert19Note }
      ]);
      ord += 1;
    }
    if (pat.Insert20Name != null || pat.Insert20Code != null || pat.Insert20Note != null) {
      body.push([
        { text: ' ', style: 'bold' },
        { text: ord, style: 'bold' },
        { text: pat.Insert20Name },
        { text: ' ', style: 'bold' },
        { text: pat.Insert20Code },
        { text: pat.Insert20Note }
      ]);
      ord += 1;
    }
    if (pat.Insert21Name != null || pat.Insert21Code != null || pat.Insert21Note != null) {
      body.push([
        { text: ' ', style: 'bold' },
        { text: ord, style: 'bold' },
        { text: pat.Insert21Name },
        { text: ' ', style: 'bold' },
        { text: pat.Insert21Code },
        { text: pat.Insert21Note }
      ]);
      ord += 1;
    }
    if (pat.Insert22Name != null || pat.Insert22Code != null || pat.Insert22Note != null) {
      body.push([
        { text: ' ', style: 'bold' },
        { text: ord, style: 'bold' },
        { text: pat.Insert22Name },
        { text: ' ', style: 'bold' },
        { text: pat.Insert22Code },
        { text: pat.Insert22Note }
      ]);
      ord += 1;
    }
    if (pat.Insert23Name != null || pat.Insert23Code != null || pat.Insert23Note != null) {
      body.push([
        { text: ' ', style: 'bold' },
        { text: ord, style: 'bold' },
        { text: pat.Insert23Name },
        { text: ' ', style: 'bold' },
        { text: pat.Insert23Code },
        { text: pat.Insert23Note }
      ]);
      ord += 1;
    }
    if (pat.Insert24Name != null || pat.Insert24Code != null || pat.Insert24Note != null) {
      body.push([
        { text: ' ', style: 'bold' },
        { text: ord, style: 'bold' },
        { text: pat.Insert24Name },
        { text: ' ', style: 'bold' },
        { text: pat.Insert24Code },
        { text: pat.Insert24Note }
      ]);
      ord += 1;
    }
    if (pat.Insert25Name != null || pat.Insert25Code != null || pat.Insert25Note != null) {
      body.push([
        { text: ' ', style: 'bold' },
        { text: ord, style: 'bold' },
        { text: pat.Insert25Name },
        { text: ' ', style: 'bold' },
        { text: pat.Insert25Code },
        { text: pat.Insert25Note }
      ]);
      ord += 1;
    }

    // Done.
    return body;
  }

  /**
   * @method getPatQty
   * @description get the number of pieces for a given pattern
   * @param {string} pattern - the given pattern code
   * @returns {number} the number of pieces tallyed
   */
  private getPatQty(pattern: string) {
    var patQty = 0;
    for (var i = 0; i < this.jobPatterns.length; i++) {
      if (pattern == this.jobPatterns[i].Jobpat) {
        patQty += parseInt(this.jobPatterns[i].PackShip);
        patQty += parseInt(this.jobPatterns[i].cbas);
        patQty += parseInt(this.jobPatterns[i].cpre);
        patQty += parseInt(this.jobPatterns[i].ccrt);
        patQty += parseInt(this.jobPatterns[i].cwalk125);
        patQty += parseInt(this.jobPatterns[i].csat);
        patQty += parseInt(this.jobPatterns[i].cbasbar);
        patQty += parseInt(this.jobPatterns[i].cdig3bar);
        patQty += parseInt(this.jobPatterns[i].cdig5bar);
        patQty += parseInt(this.jobPatterns[i].caadc);
        patQty += parseInt(this.jobPatterns[i].cmaadc);
        patQty += parseInt(this.jobPatterns[i].cbas3dig);
        patQty += parseInt(this.jobPatterns[i].foreign);
        patQty += parseInt(this.jobPatterns[i].canadian);
      }
    }
    return patQty;
  }

  /**
   * @method formatUsPhone
   * @description Reformat phone data into the US Phone Number format/style
   * @param {string} phone - phone number to be reformatted
   * @returns {string} the reformatted phone number
   */
  private formatUsPhone(phone: string) {
    var phoneTest = new RegExp(/^((\+1)|1)? ?\(?(\d{3})\)?[ .-]?(\d{3})[ .-]?(\d{4})( ?(ext\.? ?|x)(\d*))?$/);
    if (phone != null) {
      phone = phone.trim();
      var results = phoneTest.exec(phone);
      if (results !== null && results.length > 8) {
        return "(" + results[3] + ") " + results[4] + "-" + results[5] + (typeof results[8] !== "undefined" ? " x" + results[8] : "");
      }
      else {
        return phone;
      }
    } else {
      return ' ';
    }
  }

  /**
   * @method formatUsZipCode
   * @description reformat zip code data into US Zip Code format/style
   * @param {string} zip - the Zip Code to be reformatted
   * @returns {string} the reformatted Zip Code
   */
  private formatUsZipCode(zip: string) {
    if (!zip) {
      return zip;
    }
    if (zip.toString().length === 9) {
      return zip.toString().slice(0, 5) + "-" + zip.toString().slice(5);
    } else if (zip.toString().length === 5) {
      return zip.toString();
    } else {
      return zip;
    }
  }

  /**
   * @method formatUsDate
   * @description use momemtJS to format a date into yy/mm/dd
   * @param {string} x the Date to be reformatted
   * @returns {string} the formatted date
   */
  private formatUsDate(x: string) {
    return moment(x).format('l')
  }

  /**
   * @method addCommas
   * @description reformatts a number by adding colums for thousands deliniation
   * @param {number} intNum the number to add commas to
   * @returns {string} the formatted number with commas (US Style)
   */
  private addCommas(intNum: number) {
    return (intNum + '').replace(/(\d)(?=(\d{3})+$)/g, '$1,');
  }

  /**
   * @method getSampleCellClass
   * @description apply background color (css class) based on status value
   * @param row current table row
   * @param column currrent table column
   * @param value current cell value
   * @returns object class containing css classes to be applied based on value
   */
  private getSampleCellClass({ row, column, value }): any {
    return {
      'sample-new': value === 'New',
      'sample-replacement': value === 'Replacement',
      'sample-in-progress': value === 'In Process',
      'sample-issue': value === 'Issue',
      'sample-complete': value === 'Complete',
    };
  }

  /**
   * @method getPaperworkCellClass
   * @description apply background color (css class) based on status value
   * @param {any} row current table row
   * @param {any} column currrent table column
   * @param {any} value current cell value
   * @returns object class containing css classes to be applied based on value
   */
  private getPaperworkCellClass({ row, column, value }): any {
    return {
      'paperwork-new': value === 'New',
      'paperwork-replacement': value === 'Replacement',
      'paperwork-in-progress': value === 'In Process',
      'paperwork-issue': value === 'Issue',
      'paperwork-complete': value === 'Complete',
    };
  }

  /**
   * @method checkAutoRefresh
   * @desc set the auto-data-refresh state
   * @param {$event} change event
   */
  private checkAutoRefresh($event){
    this.isAutoRefreshChecked = !this.isAutoRefreshChecked;
    if (this.isAutoRefreshChecked){
      this.toastr.success('Auto-Refreshed Enabled...', 'bl-status: Data Service');
    } else{
      this.toastr.warning('Auto-Refreshed Disabled...', 'bl-status: Data Service');
    }
  }

  pieChartClicked(){

  }

  lineChartClicked(){

  }

  barChartClicked(){

  }

  /**
   * @method ngOnDestroy
   * @description Component clean-up
   */
  ngOnDestroy() {
    /** dispose of any active subsriptions to prevent memory leak */
    // TODO: use the suscriptions array for ALL Observables
    this.subscriptions.forEach((sub) => { sub.unsubscribe(); })
  }

}
