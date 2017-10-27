declare var moment: any;  /** prevent TypeScript typings error when using non-TypeSCript Lib (momentJS) */
// Angular 2/4 native libraries
import { Component, OnInit, ViewEncapsulation, ViewChild } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subscription } from "rxjs/Subscription";
import 'rxjs/add/operator/map'

// 3rd-party/open-source components
import { DaterangepickerConfig } from 'ng2-daterangepicker';
import { DaterangePickerComponent } from 'ng2-daterangepicker';
import { ToastrService } from 'ngx-toastr';
import { SelectModule } from 'ng2-select';
import * as FileSaver from 'file-saver';

// custom services
import { DataService } from '../data.service';
import { LoggingService } from '../logging.service';

@Component({
  selector: 'app-dropshipping',
  templateUrl: './dropshipping.component.html',
  styleUrls: ['./dropshipping.component.css']
})
export class DropshippingComponent implements OnInit {

  // misc variables
  public isDataLoaded: boolean = false;
  public logoImagePath: string = "../assets/EMS_Envelope_T.png";
  public filterText: string = null;
  public lastRefreshDate: any = moment();
  public pieceTypes: Array<string> = ['Letter', 'Flat', 'PC'];
  public statuses: Array<string> = ['New', 'In Process', 'Issue', 'Replacement', 'Complete'];
  public selectedFilterPieceType: string = null;
  public selectedFilterStatus: string = null;
  public isAutoRefreshChecked: boolean = false;

  // Observable Subscriptions Array
  private subscriptions: Subscription[] = [];

  // data-table variables (ngx-datatable)
  public rows: any[] = [];
  public temp = []
  //public temp2 = [];
  public data = [];
  public expanded: any = {};
  public timeout: any;
  @ViewChild('dropShippingTable') table: any; /** data table html reference */

  // datepicker - date range (ng2-daterangepicker) variables
  @ViewChild(DaterangePickerComponent)
  private picker: DaterangePickerComponent;
  public daterange: any = {};
  public selectedDate(value: any, datepicker?: any) {

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
      startDate: moment().format("MM/DD/YY"),
      endDate: moment().add(6, 'days').format("MM/DD/YY")
    };
  }

  /**
   * @method ngOnInit
   * @desc initialize component
   */
  ngOnInit() {
    // set date range
    this.daterange.start = moment().format("MM/DD/YY");
    this.daterange.end = moment().add(6, 'days').format("MM/DD/YY");
    // get latest status data
    this.refreshStatusData();
    // log the event
    this.logger.addToLog("INFO", "Drop Shipping Component activated.").subscribe((data => {
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
   * @method updatePatternFilter
   * @desc filter rows (patterns) as user types
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
      //this.temp2 = [...data];   /** charting */

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
   * @method downloadFile
   * @desc use dataservice to download a file (PDF) from the server (via API)
   * @param {string} file name of the file to download
   */
  downloadFile(file: string, pattern: string, fileType: string) {
    // show loading animation
    this.isDataLoaded = false;

    // download the file
    this.ds.downloadFile(file, pattern, fileType).subscribe((data => {
      {
        // create PDF file from downloaded binary data
        let fileBlob = data.blob();
        let blob = new Blob([fileBlob], {
          type: 'application/pdf'
        });
        let filename = file;
        // trigger native browser file-save mechanism
        FileSaver.saveAs(blob, filename);
      }

      this.refreshStatusData();
      // hide loading animation
      this.isDataLoaded = true;


      // log the event
      this.toastr.success('File Downloaded!', 'bl-status: Data Service');
      this.logger.addToLog("INFO", "File Downloaded: " + file).subscribe((data => {
        const ack = data;
        if (!ack) {
          this.toastr.error('Logging Error!', 'bl-status: Logging Service');
        }
      }));
    }),
    // error handler
    (err => {
      // hide loading animation
      this.isDataLoaded = true;

      // log the event
      this.toastr.error('File Download Error!', 'bl-status: Data Service');
      this.logger.addToLog("ERROR", "File Download Error: " + file).subscribe((data => {
        const ack = data;
        if (!ack) {
          this.toastr.error('Logging Error!', 'bl-status: Logging Service');
        }
      }));
    }))
  }

  /**
   * @method checkPalletTagDownload
   * @desc determine if Pallet Tag file is available for download
   * @param {string} file the Pallet Tag file name field value
   */
  checkPalletTagDownload(file: string){
    // disable download button if Pallet Tag file name is null/blank
    if ((file == "") || (file == " ")){
      return true;
    } else{
      return false;
    }
  }

  /**
   * @method checkPalletWorksheetDownload
   * @desc determine if Pallet Worksheet file is available for download
   * @param {string} file the Pallet Worksheet file name field value
   */
  checkPalletWorksheetDownload(file: string){
    // disable download button if Worksheet file name is null/blank
    if ((file == "") || (file == " ")){
      return true;
    } else{
      return false;
    }
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
