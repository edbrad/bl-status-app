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
  public messageTypes: Array<string> = ['INFO', 'WARNING', 'ERROR', 'SUCCESS'];
  public userTypes: Array<string> = ['Guest', 'Sampleroom', 'Accounting', 'Dropshipping'];
  public selectedFilterLogType: string = null;
  public selectedFilterUserType: string = null;
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
    this.refreshLogData("app", this.daterange.start, this.daterange.end);
  }

  /**
   * @method logTypeSelected
   * @desc apply log type filter selection
   * @param {any} value the selected piece type filter value
   */
  public logTypeFilterSelected(value: any) {
    this.selectedFilterLogType = value.text;
    this.refreshLogData("app", this.daterange.start, this.daterange.end);
  }

  /**
   * @method logTypeRemoved
   * @desc remove log type filter selection
   * @param {any} value
   */
  public logTypeFilterRemoved(value: any) {
    this.selectedFilterLogType = null;
    this.refreshLogData("app", this.daterange.start, this.daterange.end);
  }

  /**
   * @method userTypeSelected
   * @desc apply user type filter selection
   * @param {any} value the selected piece type filter value
   */
  public userTypeFilterSelected(value: any) {
    this.selectedFilterUserType = value.text;
    this.refreshLogData("app", this.daterange.start, this.daterange.end);
  }

  /**
   * @method userTypeRemoved
   * @desc remove user type filter selection
   * @param {any} value
   */
  public userTypeFilterRemoved(value: any) {
    this.selectedFilterUserType = null;
    this.refreshLogData("app", this.daterange.start, this.daterange.end);
  }


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
        'Last 7 Days': [moment(), moment().subtract(6, 'days')],
        'Last 30 Days': [moment().subtract(30, 'days'), moment()],
        'Last 3 Months': [moment().subtract(3, 'month'), moment()],
        'Last 6 Months': [moment().subtract(6, 'month'), moment()],
        'Last 12 Months': [moment().subtract(12, 'month'), moment()],
      },
      startDate: moment().format("MM/DD/YY"),
      endDate: moment().add(6, 'days').format("MM/DD/YY")
    };
  }

  ngOnInit() {
    // set date range
    this.daterange.start = moment().format("MM/DD/YY");
    this.daterange.end = moment().format("MM/DD/YY");
    // get latest status data
    this.refreshLogData("app", this.daterange.start, this.daterange.end);
     // log the event
     this.logger.addToLog("INFO", "Admin Component activated.").subscribe((data => {
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
      this.refreshLogData("app", this.daterange.start, this.daterange.end);
      this.toastr.info('Data Auto-Refreshed...', 'bl-status: Data Service');
    }
  }

  refreshLogData(type: string, startDate: string, endDate: string) {
    // get all statuses from the external REST API
    var eventFilter: any[] = [];       /* Log Event Type filter data bucket */
    var userTypeFilter: any[] = [];    /* User Type filter data bucket */
    // show loading indicator
    this.isDataLoaded = false;
    this.ds.getLogs(type, startDate, endDate).subscribe((data => {
      // clear loading indicator
      this.isDataLoaded = true;
      // cache data for datatable filtering
      this.temp = [...data];    /** datatable */
      // save data from database
      this.appLogRows = data;

      // whenever the filter changes, always go back to the first page
      this.table.offset = 0;

      // update last refresh time display
      this.lastRefreshDate = moment();

      console.log("log: "+ JSON.stringify(this.appLogRows));

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
   * @param milliseconds
   */
  public convertLogDate(milliseconds: string){
    var logDate = new Date(milliseconds);
    var outDate = moment(logDate).format('MM/DD/YY, h:mm:ss a')
    return outDate;
  }

}

