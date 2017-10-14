declare var moment: any;  /** prevent TypeScript typings error when using non-TypeSCript Lib (momentJS) */
import { Component, OnInit, ViewEncapsulation, ViewChild } from '@angular/core';

// 3rd-party/open-source components
import { ToastrService } from 'ngx-toastr';
import { DaterangepickerConfig } from 'ng2-daterangepicker';
import { DaterangePickerComponent } from 'ng2-daterangepicker';

// custom services
import { LoggingService } from '../logging.service';
import { AuthenticationService } from '../auth/auth.service';
import { DataService } from '../data.service';

@Component({
  selector: 'app-sampleroom',
  templateUrl: './sampleroom.component.html',
  styleUrls: ['./sampleroom.component.css']
})
export class SampleroomComponent implements OnInit {

  // misc variables
  isDataLoaded:boolean = false;
  logoImagePath: string = "../assets/EMS_Envelope_T.png";
  filterText: string = null;
  isLetterFilterChecked: boolean = false;
  isFlatFilterChecked: boolean = false;
  isCompleteFilterChecked: boolean = false;
  lastRefreshDate: Date = moment();
  public pieceTypes:Array<string> = ['Letter', 'Flat'];
  public statuses:Array<string> = ['New', 'In Process', 'Issue', 'Replacement', 'Complete'];
  public selectedFilterPieceType: string = null;
  public selectedFilterStatus: string = null;

  // data-table variables (ngx-datatable)
  rows: any[] = [];
  temp = []
  data = [];
  expanded: any = {};
  expanded_save: any = {};
  timeout: any;
  @ViewChild('sampleRoomTable') table: any; /** data table html reference */

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
    this.refreshStatusData();
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
   * @method constructor
   * @description component contructor method
   * @param logger logging service
   * @param ds data service
   * @param toastr pop-up notification service
   * @param authenticationService user authentication service
   * @param daterangepickerOptions date range picker service
   */
  constructor(private logger: LoggingService,
    private ds: DataService,
    private toastr: ToastrService,
    private authenticationService: AuthenticationService,
    private daterangepickerOptions: DaterangepickerConfig) {
    // initialize DatePicker (for drop date range filter)
    this.daterangepickerOptions.settings = {
      locale: { format: 'MM/DD/YY' },
      alwaysShowCalendars: false,
      ranges: {
        'Today': [moment(), moment()],
        'This Week': [moment(), moment().add(6, 'days')],
        'This Month': [moment(), moment().subtract(1, 'months')],
        'Last Month': [moment().subtract(1, 'month'), moment()],
        'Last 3 Months': [moment().subtract(3, 'month'), moment()],
        'Last 6 Months': [moment().subtract(6, 'month'), moment()],
        'Last 12 Months': [moment().subtract(12, 'month'), moment()],
      },
      startDate: moment().subtract(1, 'month'),
      endDate: moment()
    };
  }

  /**
   * initialize this component
   */
  ngOnInit() {
     // set initial date range
    this.daterange.start = moment().subtract(1, 'month');
    this.daterange.end = moment();
    // get latest status data
    this.refreshStatusData();
    // log the event
    this.logger.addToLog("INFO", "Sample Room Component activated.").subscribe((data => {
      const ack = data;
      if (!ack){
        this.toastr.error('Logging Error!', 'bl-status: Logging Service');
      }
    }));
  }

  /**
   * @method isComplete
   * @description determine if all tasks are done (sample & paperwork)
   * @param sampleStatus
   * @param paperworkStatus
   * @returns true/false
   */
  isComplete(sampleStatus: string, paperworkStatus: string) {
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
   * @param event key-up event from the filter field
   */
  updatePatternFilter(event) {
    const val = event.target.value.toLowerCase();
    // filter pattern code data
    const temp = this.temp.filter(function (d) {
      return d.pattern.toLowerCase().indexOf(val) !== -1 || !val;
    });
    // apply filter
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
      // cache data for datatable filtering
      this.temp = [...data];    /** datatable */

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
      if (this.daterange.start && this.daterange.end) {
        var s = this.daterange.start;
        var e = this.daterange.end;
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
   * @param row current table row
   * @param column currrent table column
   * @param value current cell value
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

}
