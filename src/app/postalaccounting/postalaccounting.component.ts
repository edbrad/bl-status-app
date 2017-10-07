declare var moment: any;  /** prevent TypeScript typings error when using non-TypeSCript Lib (momentJS) */
import { Component, OnInit, ViewEncapsulation, ViewChild } from '@angular/core';

// 3rd-party/open-source components
import { ToastrService } from 'ngx-toastr';
import { DaterangepickerConfig } from 'ng2-daterangepicker';
import { DaterangePickerComponent } from 'ng2-daterangepicker';
import { FileUploader, FileUploaderOptions, Headers, FileItem } from 'ng2-file-upload/ng2-file-upload';

// custom services
import { LoggingService } from '../logging.service';
import { AuthenticationService } from '../auth/auth.service';
import { DataService } from '../data.service';

@Component({
  selector: 'app-postalaccounting',
  templateUrl: './postalaccounting.component.html',
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./postalaccounting.component.css']
})
export class PostalaccountingComponent implements OnInit {

  // misc variables
  isDataLoaded:boolean = false;
  logoImagePath: string = "../assets/EMS_Envelope_T.png";
  filterText: string = null;
  isLetterFilterChecked: boolean = false;
  isFlatFilterChecked: boolean = false;
  isCompleteFilterChecked: boolean = false;
  lastRefreshDate: Date = moment();

  // data-table variables (ngx-datatable)
  rows: any[] = [];
  temp = []
  data = [];
  expanded: any = {};
  expanded_save: any = {};
  timeout: any;
  @ViewChild('postalAccountingTable') table: any; /** data table html reference */
  expandedRows: any[] = [];

  // file upload metadata fields (stored in db)
  pattern = "9999-99X";
  fileType = "Pallet Tags"
  user = this.authenticationService.getUsername();
  clientFilePath = "Client File Path Goes Here...";
  serverFilePath = "";
  filePostDateTime = moment().format();
  downloadCount = 0;
  replacementCount = 0;

  // file upload progress fields
  palletTagUploadProgress: any[] = [];
  palletWorksheetUploadProgress: any[] = [];
  currentPalletTagPattern: string = "";
  currentWorksheetPattern: string = "";

  // API url
  urlRoot: string = 'http://172.16.248.19:8080/api'; // test

  // intialize Pallet Tag file uploader instance
  uploaderPalletTags: FileUploader = new FileUploader({
    url: this.urlRoot + "/file-upload/",
    /* file catalog metadata */
    additionalParameter:{
      pattern: this.pattern,
      fileType: this.fileType,
      user: this.user,
      clientFilePath: this.clientFilePath,
      serverFilePath: this.serverFilePath,
      filePostDateTime: this.filePostDateTime,
      downloadCount: this.downloadCount,
      replacementCount: this.replacementCount
    },
    isHTML5: true,
    disableMultipart: false,
    /* only allow PDF's and text files to be uploaded */
    allowedMimeType: ['application/pdf','text/plain'],
    maxFileSize: 100*1024*1024 // 100 MB
  });

  // intialize Pallet Worksheet file uploader instance
  uploaderPalletWorksheets: FileUploader = new FileUploader({
    url: this.urlRoot + "/file-upload/",
    /* file catalog metadata */
    additionalParameter:{
      pattern: this.pattern,
      fileType: this.fileType,
      user: this.user,
      clientFilePath: this.clientFilePath,
      serverFilePath: this.serverFilePath,
      filePostDateTime: this.filePostDateTime,
      downloadCount: this.downloadCount,
      replacementCount: this.replacementCount
    },
    isHTML5: true,
    disableMultipart: false,
    /* only allow PDF's and text files to be uploaded */
    allowedMimeType: ['application/pdf','text/plain'],
    maxFileSize: 100*1024*1024 // 100 MB
  });

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
    this.logger.addToLog("INFO", "Postal Accounting Component activated.").subscribe((data => {
      const ack = data;
      if (!ack){
        this.toastr.error('Logging Error!', 'bl-status: Logging Service');
      }
    }));

    // -- Pallet Tag Uploader event hooks
    // get ready for Pallet Tags file upload (ng2-file-uploader)
    this.uploaderPalletTags.onAfterAddingFile = (file)=> {
      // disable authentication
      file.withCredentials = false;
      // update file metadata
      this.uploaderPalletTags.options.additionalParameter['pattern'] = this.currentPalletTagPattern;
      this.uploaderPalletTags.options.additionalParameter['fileType'] = "Pallet Tags";
      this.uploaderPalletTags.options.additionalParameter['user'] = this.user;
      this.uploaderPalletTags.options.additionalParameter['clientFilePath'] = file.file.name;
      this.uploaderPalletTags.options.additionalParameter['serverFilePath'] = this.serverFilePath;
      this.uploaderPalletTags.options.additionalParameter['filePostDateTime'] = moment().format();
      this.uploaderPalletTags.options.additionalParameter['downloadCount'] = 0;
      this.uploaderPalletTags.options.additionalParameter['replacementCount'] = this.checkReplacementCount(this.currentPalletTagPattern, file.file.name);
    };

    // override Pallet Tags progress bar method - to set progress for the appropriate pattern
    this.uploaderPalletTags.onProgressItem = (fileItem: FileItem, progress: any) => {
      for (var i in this.palletTagUploadProgress){
        if(this.palletTagUploadProgress[i].pattern == this.currentPalletTagPattern){
          this.palletTagUploadProgress[i].progress = this.uploaderPalletTags.progress;
        }
      }
    };

    // post Pallet Tags file upload processing
    this.uploaderPalletTags.onCompleteItem = (item: any, response: any, status: any, headers: any) => {
      this.toastr.success('File Uploaded!', 'bl-status: FileUploader');
      this.uploaderPalletTags.removeFromQueue(item);
      this.refreshStatusData();
    };

    // -- Pallet Worksheet Uploader event hooks
    // get ready for Pallet Worksheet file upload (ng2-file-uploader)
    this.uploaderPalletWorksheets.onAfterAddingFile = (file)=> {
      // disable authentication
      file.withCredentials = false;
      // update file metadata
      this.uploaderPalletWorksheets.options.additionalParameter['pattern'] = this.currentWorksheetPattern;
      this.uploaderPalletWorksheets.options.additionalParameter['fileType'] = "Pallet Worksheet";
      this.uploaderPalletWorksheets.options.additionalParameter['user'] = this.user;
      this.uploaderPalletWorksheets.options.additionalParameter['clientFilePath'] = file.file.name;
      this.uploaderPalletWorksheets.options.additionalParameter['serverFilePath'] = this.serverFilePath;
      this.uploaderPalletWorksheets.options.additionalParameter['filePostDateTime'] = moment().format();
      this.uploaderPalletWorksheets.options.additionalParameter['downloadCount'] = 0;
      this.uploaderPalletWorksheets.options.additionalParameter['replacementCount'] = this.checkReplacementCount(this.pattern, file.file.name);
    };

    // override Pallet Worksheet progress bar method - to set progress for the appropriate pattern
    this.uploaderPalletWorksheets.onProgressItem = (fileItem: FileItem, progress: any) => {
      for (var i in this.palletWorksheetUploadProgress){
        if(this.palletWorksheetUploadProgress[i].pattern == this.currentWorksheetPattern){
          this.palletWorksheetUploadProgress[i].progress = this.uploaderPalletWorksheets.progress;
        }
      }
    };

    // post Pallet Worksheet file upload processing
    this.uploaderPalletWorksheets.onCompleteItem = (item: any, response: any, status: any, headers: any) => {
      this.toastr.success('File Uploaded!', 'bl-status: FileUploader');
      this.uploaderPalletWorksheets.removeFromQueue(item);
      this.refreshStatusData();
    };
  }

  /**
   * @method uploadPalletTags
   * @description invoke the ng-file-uploader - upload process
   * @param pattern
   */
  uploadPalletTags(pattern: string){
    this.currentPalletTagPattern = pattern;
    this.uploaderPalletTags.uploadAll();
  }

   /**
   * @method uploadPalletWorksheet
   * @description invoke the ng-file-uploader - upload process
   * @param pattern
   */
  uploadPalletWorksheet(pattern: string){
    this.currentWorksheetPattern = pattern;
    this.uploaderPalletWorksheets.uploadAll();
  }

  /**
   * @method getPalletTagProgress
   * @description get the progress (%) for the current file being uploaded (tracked in array)
   * @param pattern the associated pattern for the file being uploaded
   */
  getPalletTagProgress(pattern: string) {
    var progress: number = 0;
      for (var x in this.palletTagUploadProgress) {
        if (this.palletTagUploadProgress[x].pattern == pattern) {
          progress = this.palletTagUploadProgress[x].progress;
        }
      }
    return progress;
  }

  /**
   * @method getPalletWorksheetProgress
   * @description get the progress (%) for the current file being uploaded (tracked in array)
   * @param pattern the associated pattern for the file being uploaded
   */
  getPalletWorksheetProgress(pattern: string) {
    var progress: number = 0;
      for (var x in this.palletWorksheetUploadProgress) {
        if (this.palletWorksheetUploadProgress[x].pattern == pattern) {
          progress = this.palletWorksheetUploadProgress[x].progress;
        }
      }
    return progress;
  }

  /**
   * @method setCurrentPalletPattern
   * @description set the associated pattern for the file being uploaded (tracked in array)
   * @param pattern the associated pattern for the file being uploaded
   */
  setCurrentPalletPattern(pattern: string){
    this.currentPalletTagPattern = pattern;
    // reset upload progress
    for (var i in this.palletTagUploadProgress){
      if(this.palletTagUploadProgress[i].pattern == this.currentPalletTagPattern){
        this.palletTagUploadProgress[i].progress = 0;
      }
    }
  }

  /**
   * @method setCurrentWorksheetPattern
   * @description set the associated pattern for the file being uploaded (tracked in array)
   * @param pattern the associated pattern for the file being uploaded
   */
  setCurrentWorksheetPattern(pattern: string){
    this.currentWorksheetPattern = pattern;
    // reset upload progress
    for (var i in this.palletWorksheetUploadProgress){
      if(this.palletWorksheetUploadProgress[i].pattern == this.currentWorksheetPattern){
        this.palletWorksheetUploadProgress[i].progress = 0;
      }
    }
  }

  /**
   * @method enablePalletTagsUpload
   * @description determine if the current upload button is to be enabled to
   * allow upload - a file must be selected
   * @param pattern the associated pattern for the file being uploaded
   */
  enablePalletTagsUpload(pattern: string){
    if (this.uploaderPalletTags.getNotUploadedItems().length > 0 &&
    this.currentPalletTagPattern == pattern){
      return false;
    }
    else{
      return true;
    }
  }

  /**
   * @method enablePalletWorksheetUpload
   * @description determine if the current upload button is to be enabled to
   * allow upload - a file must be selected
   * @param pattern the associated pattern for the file being uploaded
   */
  enablePalletWorksheetUpload(pattern: string){
    if (this.uploaderPalletWorksheets.getNotUploadedItems().length > 0 &&
    this.currentWorksheetPattern == pattern){
      return false;
    }
    else{
      return true;
    }
  }

  /**
   * @method checkReplacementCount
   * @description check for existing file and return the replacement count
   * @param pattern the given pattern to check
   * @param fileName the given file name to check
   */
  checkReplacementCount(pattern: string, fileName: string){
    // TODO: check for exiting file in database (file catalog) and filesystem; iterate replacement
    // count accordingly

    // return the existing replacement count
    return 0;
  }

  /**
   * @method checkLettersFilter
   * @description respond to letter checkbox filter -  check event
   * @param  $event check event
   */
  checkLettersFilter($event) {
    this.isLetterFilterChecked = !this.isLetterFilterChecked;
    // toggle Flats checkbox appropriately (cannot have both letter and flat checked)
    if (this.isFlatFilterChecked) {
      this.isFlatFilterChecked = false;
    }
    // apply filter
    this.refreshStatusData();
  }

  /**
   * @method checkFlatsFilter
   * @description respond to flat checkbox filter -  check event
   * @param  $event check event
   */
  checkFlatsFilter($event) {
    this.isFlatFilterChecked = !this.isFlatFilterChecked;
    // toggle Letters checkbox appropriately (cannot have both letter and flat checked)
    if (this.isLetterFilterChecked) {
      this.isLetterFilterChecked = false;
    }
    // apply filter
    this.refreshStatusData();
  }

  /**
   * @method checkCompleteFilter
   * @description respond to flat checkbox filter -  check event
   * @param  $event check event
   */
  checkCompleteFilter($event) {
    this.isCompleteFilterChecked = !this.isCompleteFilterChecked;
    // apply filter
    this.refreshStatusData();
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
  refreshStatusData() {
    this.expanded_save = this.expanded;
    // initialize filter "buckets" to hold possible filters
    var textFilter: any[] = [];
    var dateFilter: any[] = [];
    var pieceFilter: any[] = [];
    var completeFilter: any[] = [];

    // get all statuses from the external REST API
    this.ds.getAllStatuses().subscribe((data => {
      // clear loading indicator
      this.isDataLoaded = true;
      // save data from database
      this.rows = data;
      // cache data for filtering
      this.temp = [...data];

      // filter pattern code
      if (this.filterText != null) {
        const val = this.filterText.toLocaleLowerCase();
        textFilter = this.temp.filter(function (d) {
          return d.pattern.toLowerCase().indexOf(val) !== -1 || !val;
        });
      }
      else {
        // pass-through - no filter needed
        textFilter = [...this.temp];
      }

      // filter drop date
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
        // pass-through - no filter needed
        dateFilter = [...textFilter]
      }

      // filter piece type
      if (this.isLetterFilterChecked && !this.isFlatFilterChecked) {

        pieceFilter = dateFilter.filter(function (d) {
          if (d.type == "Letter") {
            return true;
          }
          else {
            return false;
          }
        });
      }
      else if (this.isFlatFilterChecked && !this.isLetterFilterChecked) {
        pieceFilter = dateFilter.filter(function (d) {
          if (d.type == "Flat") {
            return true;
          }
          else {
            return false;
          }
        });
      }
      else {
        // pass-through - no filter needed
        pieceFilter = [...dateFilter]
      }

      // filter complete status
      if (this.isCompleteFilterChecked) {
        completeFilter = [...pieceFilter]
        completeFilter = pieceFilter.filter(function (d) {
          if (d.sampleStatus == "Complete" && d.paperworkStatus == "Complete") {
            return true;
          }
          else {
            return false;
          }
        });
      }
      else {
        // pass-through - no filter needed
        completeFilter = [...pieceFilter]
      }

      // re-initialize Pallet Tag & Worksheet upload progress arrays
      this.palletTagUploadProgress = [];
      for(var p of completeFilter){
        var pat = {
          pattern: p['pattern'],
          progress: 0
        }
        this.palletTagUploadProgress.push(pat);
      }
      this.palletWorksheetUploadProgress = [];
      for(var p of completeFilter){
        var pat = {
          pattern: p['pattern'],
          progress: 0
        }
        this.palletWorksheetUploadProgress.push(pat);
      }

      // expand rows that were already expanded before refresh
      /*for(var row of this.expandedRows){
        console.log("re-expandx row: " + JSON.stringify(row));
        this.table.rowDetail.toggleExpandRow(row);
      }*/
      //this.table.rowDetail.expandAllRows();
      //this.expandAllDetails()

      // finally, update the rows to be displayed
      this.rows = completeFilter;
      this.expanded = this.expanded_save;


      // whenever the filter changes, always go back to the first page
      //this.table.offset = 0;
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
   * @method toggleExpandRow
   * @description toggle selected row detail view open and closed
   * @param row the selected row
   */
  toggleExpandRow(row, expanded) {
    console.log("toggle row pattern: " + row.pattern + " exp: " + JSON.stringify(expanded));
    console.log("this-expanded: " + JSON.stringify(expanded));
    console.log("row: " + JSON.stringify(row))
    this.table.rowDetail.toggleExpandRow(row);
    if (expanded == false) {
      this.expandedRows.push(row);
    }
    else {
      const idx: number = this.expandedRows.indexOf(row);
      if (idx != -1) {
        this.expandedRows.splice(idx, 1);
      }
    }
    console.log("expanded row count: " + this.expandedRows.length);
  }

  /**
   * @method onDetailToggle
   * @description capture row detail toggle event
   * @param event the given toggle even
   */
  onDetailToggle(event) {
    // TODO: trigger "In progress" status when user views the pattern details
    console.log("detail toggle event!: " + JSON.stringify(event))
  }

  expandAllDetails(){
    console.log("expand all");
    this.table.rowDetail.expandAllRows()
  }

  collapseAllDetails(){
    console.log("collapse all details!");
    this.table.rowDetail.collapseAllRows()
  }

  onExpandRow(row) {
    console.log("onExpandRow event!")
    this.table.rowDetail.collapseAllRows();
    this.table.rowDetail.toggleExpandRow(row);
 }

  onCollapseRow() {
    console.log("onCollapseRow event!")
    this.table.rowDetail.collapseAllRows();
  }

  restoreDetails() {
    for (var row of this.expandedRows) {
      console.log("re-expandx row: " + JSON.stringify(row));
      this.table.rowDetail.toggleExpandRow(row);
    }
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
   * @method hideNewLabel
   * @description
   * @param row
   */
  hideNewLabel(row){
    if (row.paperworkStatus != "Replacement"){
      return false;
    }
    else{
      return true;
    }
  }

  hideReplacementLabel(row){
    if (row.paperworkStatus == "Replacement"){
      return false;
    }
    else{
      return true;
    }
  }

  hideInProgressLabel(row){
    if(row.paperworkStatus == "In Process" || row.paperworkStatus == "Complete"
      || row.paperworkStatus == "Issue" ){
      return false;
    }
    else{
      return true;
    }
  }

  hideIssueLabel(row){
    if(row.paperworkStatus == "Issue" ){
      return false;
    }
    else{
      return true;
    }
  }

  hideCompleteLabel(row){
    if(row.paperworkStatus == "Complete" ){
      return false;
    }
    else{
      return true;
    }
  }

}
