declare var moment: any;  /** prevent TypeScript typings error when using non-TypeSCript Lib (momentJS) */
import { Component, OnInit, OnDestroy, ViewEncapsulation, ViewChild } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subscription } from "rxjs/Subscription";
// 3rd-party/open-source components
import { ToastrService } from 'ngx-toastr';
import { TabsetComponent } from 'ngx-bootstrap';
import { DaterangepickerConfig } from 'ng2-daterangepicker';
import { DaterangePickerComponent } from 'ng2-daterangepicker';
import { SelectModule } from 'ng2-select';
// custom services
import { LoggingService } from '../logging.service';
import { DataService } from '../data.service';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {

  // misc variables
  isDataLoaded:boolean = false;
  lastRefreshDate: any = moment();
  public logLevels: Array<string> = ['INFO', 'WARN', 'ERROR', 'SUCCESS'];
  public users: Array<string> = ['Guest', 'sampleroom', 'accounting', 'dropshipping', 'admin']; /* TODO: get from DB */
  public selectedLogLevel: string = null;
  public selectedUser: string = null;
  public isAutoRefreshChecked: boolean = false;

  // Observable Subscriptions Array
  private subscriptions: Subscription[] = [];

  // data-table variables (ngx-datatable)
  appLogRows: any[] = [];
  temp = []
  data = [];
  expanded: any = {};
  expanded_save: any = {};
  timeout: any;
  @ViewChild('appLogTable') table: any; /** data table html reference */

  // datepicker config - date range (ng2-daterangepicker)
  @ViewChild(DaterangePickerComponent)
  private picker: DaterangePickerComponent;
  public daterange: any = {};

  /**
   * @method selectedDate
   * @description capture the selected date range and filter status data
   * @param value
   * @param datepicker
   */
  public selectedDate(value: any, datepicker?: any) {
    // any object can be passed to the selected event and it will be passed back here
    datepicker.start = value.start;
    datepicker.end = value.end;

    // or manupulate internal property
    this.daterange.start = value.start;
    this.daterange.end = value.end;
    this.daterange.label = value.label;

    // refresh data
    this.refreshLogData("app");
  }

  /**
   * @method levelFilterSelected
   * @desc apply log type filter selection
   * @param {any} value the selected piece type filter value
   */
  public levelFilterSelected(value: any) {
    this.selectedLogLevel = value.text;
    this.refreshLogData("app");
  }

  /**
   * @method levelFilterRemoved
   * @desc remove log type filter selection
   * @param {any} value
   */
  public levelFilterRemoved(value: any) {
    this.selectedLogLevel = null;
    this.refreshLogData("app");
  }

  /**
   * @method userFilterSelected
   * @desc apply user type filter selection
   * @param {any} value the selected piece type filter value
   */
  public userFilterSelected(value: any) {
    this.selectedUser = value.text;
    this.refreshLogData("app");
  }

  /**
   * @method userFilterRemoved
   * @desc remove user type filter selection
   * @param {any} value
   */
  public userFilterRemoved(value: any) {
    this.selectedUser = null;
    this.refreshLogData("app");
  }

  /**
   *
   * @param logger
   * @param ds
   * @param toastr
   * @param daterangepickerOptions
   */
  constructor(private logger: LoggingService,
    private ds: DataService,
    private toastr: ToastrService,
    private daterangepickerOptions: DaterangepickerConfig) {
    // initialize DatePicker (for drop date range filter)
    this.daterangepickerOptions.settings = {
      locale: { format: 'MM/DD/YY' },
      alwaysShowCalendars: false,
      ranges: {
        'Today': [moment(), moment()],
        'Last 7 Days': [moment().subtract(6, 'days'), moment()],
        'Last 30 Days': [moment().subtract(30, 'days'), moment()],
        'Last 3 Months': [moment().subtract(3, 'month'), moment()],
        'Last 6 Months': [moment().subtract(6, 'month'), moment()],
        'Last 12 Months': [moment().subtract(12, 'month'), moment()],
      },
      startDate: moment().format("MM/DD/YY"),
      endDate: moment().format("MM/DD/YY")
    };
  }

  /**
   *
   */
  ngOnInit() {
    // set date range
    this.daterange.start = moment().format("MM/DD/YY");
    this.daterange.end = moment().format("MM/DD/YY");
    // get latest status data
    this.refreshLogData("app");
     // log the event
     this.logger.addToLog("SUCCESS", "Admin Component activated.").subscribe((data => {
      const ack = data;
      if (!ack){
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
      this.refreshLogData("app");
      this.toastr.info('Data Auto-Refreshed...', 'bl-status: Data Service');
    }
  }

  /**
   * @method refreshLogData
   * @desc Get latest log data and apply filters
   * @param type
   * @param startDate
   * @param endDate
   */
  refreshLogData(type: string) {
    // get all statuses from the external REST API
    var userFilter: any[] = [];       /* User filter data bucket */
    var levelFilter: any[] = [];      /* Message level filter data bucket */
    var user: string = null;
    var level: string = null;
    var startDate = moment(this.daterange.start).format('MM/DD/YY')
    var endDate = moment(this.daterange.end).format('MM/DD/YY')
    // show loading indicator
    this.isDataLoaded = false;
    this.ds.getLogs(type, startDate, endDate).subscribe((data => {
      // clear loading indicator
      this.isDataLoaded = true;
      // cache data for datatable filtering
      this.temp = [...data];    /** datatable */

      // filter by user
      if (this.selectedUser) {
        console.log("filter user: " + this.selectedUser);
        user = this.selectedUser;
        userFilter = this.temp.filter(function (d) {
          if (d.user == user) {
            return true;
          }
          else {
            return false;
          }
        });
      }
      else {
        // pass-through - no user filter selected
        userFilter = [...this.temp]
      }

      // filter by level
      if (this.selectedLogLevel) {
        console.log("filter log level: " + this.selectedLogLevel);
        level = this.selectedLogLevel;
        levelFilter = userFilter.filter(function (d) {
          if (d.level == level) {
            return true;
          }
          else {
            return false;
          }
        });
      }
      else {
        // pass-through - no log level filter selected
        levelFilter = [...userFilter]
      }

      // apply filtered data to table
      this.appLogRows = [...levelFilter];

      // whenever the filter changes, always go back to the first page
      //this.table.offset = 0;

      // update last refresh time display
      this.lastRefreshDate = moment();

    }));
  }

  /**
   * @method onPage
   * @description capture data-table paging events
   * @param event
   */
  onPage(event) {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
    }, 100);
  }

  /**
   * @method convertLogDate
   * @description convert the app log date field returned from the API (in milliseconds) to a traditionally human-readable
   * format (Date + Time)
   * @param {string} milliseconds the UTC/GMT date/time returned from the API(MongoDB), in milliseconds
   */
  public convertLogDate(milliseconds: string){
    var logDate = new Date(milliseconds);
    var wrkDate = moment.utc(logDate).subtract(6, 'hours'); // set to local time (GMT-06:00)
    var outDate = wrkDate.local().format();
    return outDate;
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

