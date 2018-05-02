declare var moment: any;  /** prevent TypeScript typings error when using non-TypeSCript Lib (momentJS) */
import { Component, OnInit, OnDestroy, ViewEncapsulation, ViewChild } from '@angular/core';
import { TemplateRef } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subscription } from "rxjs/Subscription";

// 3rd-party/open-source components
import { ToastrService } from 'ngx-toastr';
import { DaterangepickerConfig } from 'ng2-daterangepicker';
import { DaterangePickerComponent } from 'ng2-daterangepicker';
import { BsModalService } from 'ngx-bootstrap/modal';
import { BsModalRef } from 'ngx-bootstrap/modal/modal-options.class';
import { SelectModule } from 'ng2-select';

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
  lastRefreshDate: any = moment();
  public pieceTypes: Array<string> = ['Letter', 'Flat', 'PC'];
  public statuses:Array<string> = ['New', 'Complete'];
  public selectedFilterPieceType: string = null;
  public selectedFilterStatus: string = null;
  public isAutoRefreshChecked: boolean = false;

  // modal window reference
  public modalRef: BsModalRef;
  public samplePatternData: any = {};

  public isSampleIssueChecked: boolean = false;  /** SampleRoom Issue flag */
  public user = this.authenticationService.getUsername();

  // selected pattern's details
  public sampleRoomNotes: string = "";    /** storage for current Pattern Notes/Issues (for updates) */
  public status: string = "";             /** current Pattern status */

  // Observable Subscriptions Array
  private subscriptions: Subscription[] = [];

  // data-table variables (ngx-datatable)
  rows: any[] = [];
  temp = []
  data = [];
  expanded: any = {};
  expanded_save: any = {};
  timeout: any;
  editing = {};
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
    private modalService: BsModalService,
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
   * initialize this component
   */
  ngOnInit() {
    // set date range
    this.daterange.start = moment().format("MM/DD/YY");
    this.daterange.end = moment().add(6, 'days').format("MM/DD/YY");
    // get latest status data
    this.refreshStatusData();
    // log the event
    this.logger.addToLog("SUCCESS", "Sample Room Component activated.").subscribe((data => {
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
      this.refreshStatusData();
      this.toastr.info('Data Auto-Refreshed...', 'bl-status: Data Service');
    }
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
          if (d.sampleStatus == status) {
            return true;
          }
          else {
            return false;
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

  /**
   * @method checkAutoRefresh
   * @desc set the auto-data-refresh state
   * @param {$event} change event
   */
  checkAutoRefresh($event){
    this.isAutoRefreshChecked = !this.isAutoRefreshChecked;
    if (this.isAutoRefreshChecked){
      this.toastr.success('Auto-Refreshed Enabled...', 'bl-status: Data Service');
    } else{
      this.toastr.warning('Auto-Refreshed Disabled...', 'bl-status: Data Service');
    }
  }

  /**
   * @method updateSampleStatus
   * @description activate the Modal window for updating the Sample Status
   * @param {TemplateRef} template a reference to the HTML template content for the Modal window
   */
  public updateSampleStatus(template: TemplateRef<any>, row: any) {
    // show the modal window
    this.modalRef = this.modalService.show(template);

    //console.log("row: " + JSON.stringify(row));

    // clear clear "problem" fields (that can't be re-saved)
    delete row._id;
    delete row.fileStamp;
    delete row.timeStamp;

    // hold current status data
    this.samplePatternData = row;
    this.sampleRoomNotes = this.samplePatternData.sampleRoomNotes;
    this.status = this.samplePatternData.sampleStatus;

    // check if there is an existing issue and set status
    if (this.status == "Issue"){
      this.isSampleIssueChecked = true;
    }
    else{
      this.isSampleIssueChecked = false;
    }
  }

  /**
   * @method clearSampleRoomNotes
   * @desc clear Sample Notes/Issues
   */
  public clearSampleRoomNotes() {
    this.sampleRoomNotes = "";
    this.isSampleIssueChecked = false;
    this.status = "In Process";
  }

  /**
   * @method checkSampleIssue
   * @desc check/uncheck Issue flag checkbox
   */
  public checkSampleIssue(){
    this.isSampleIssueChecked = !this.isSampleIssueChecked;

    if(this.isSampleIssueChecked){
      this.status = "Issue";
    } else{
      this.status = "In Process";
    }
  }

  /**
   * @method checkBadgeStatus
   * @desc display/hide status badges based on given pattern's status
   * @param {string} status the given pattern's status
   */
  public checkBadgeStatus(status: string){
    if (this.samplePatternData.sampleStatus == status){
      return true;
    } else {
      return false;
    }
  }

  /**
   *
   * @param value
   */
  statusSelected(value: any){
    this.status = value.text;
  }


  /**
   * @method saveSampleStatus()
   * @desc save Sample Room Status/Notes/Issue changes to the database
   */
  public saveSampleStatus(){
    var data: any = {};

    this.samplePatternData.sampleStatus = this.status;
    this.samplePatternData.sampleRoomNotes = this.sampleRoomNotes;

    if (this.isSampleIssueChecked) {
      this.samplePatternData.sampleRoomNotes = this.sampleRoomNotes;
      this.samplePatternData.sampleStatus = "Issue";
    } else {
      this.samplePatternData.sampleRoomNotes = this.sampleRoomNotes;
    }

    data = this.samplePatternData;
    var response = this.ds.updateStatusByPattern(this.samplePatternData.pattern, data)
    .subscribe((data => {
      console.log("Note response: " + JSON.stringify(response));
      // log the event
      this.logger.addToLog("SUCCESS", "Sample Status Updated: " +
      "Status: " + this.samplePatternData.sampleStatus + "Notes: " +  this.sampleRoomNotes +
      " User: " + this.user).subscribe((data => {
          const ack = data;
          if (!ack) {
            this.toastr.error('Logging Error!', 'bl-status: Logging Service');
          }
        }));

      // close the Modal
      this.modalRef.hide();

      // refresh the data
      this.refreshStatusData();

      // done
      this.toastr.success('Sample Status Updated!', 'bl-status: Data Service');
    }))
  }

  /**
   *
   * @param event
   * @param columnName
   * @param rowIndex
   * @param pattern
   */
  updateStatus(event, columnName, rowIndex, pattern) {
    console.log("status change: " + event.target.value)
    var data: any = {}; // update data object

    // set information to be updated (pattern status)
    this.samplePatternData = {};
    this.samplePatternData.pattern = pattern;
    this.samplePatternData.sampleStatus = event.target.value;
    data = this.samplePatternData;

    // call API to update status in database
    var response = this.ds.updateStatusByPattern(this.samplePatternData.pattern, data)
      .subscribe((data => {
        console.log("Note response: " + response);
        // log the event
        this.logger.addToLog("SUCCESS", "Sample Status Updated: " +
          " Pattern: " + this.samplePatternData.pattern +
          " - Status: " + this.samplePatternData.sampleStatus + " - Notes: " + this.sampleRoomNotes +
          " - User: " + this.user).subscribe((data => {
            const ack = data;
            if (!ack) {
              this.toastr.error('Logging Error!', 'bl-status: Logging Service');
            }
          }));

        // refresh the data
        this.refreshStatusData();

        // done
        this.toastr.success('Sample Status Updated!', 'bl-status: Data Service');
      }))
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
