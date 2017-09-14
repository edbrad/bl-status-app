declare var moment: any;  /** prevent TypeScript typings error when using non-TypeSCript Lib (momentJS) */
import { Component, OnInit, ViewEncapsulation, ViewChild } from '@angular/core';
//
import { ToastrService } from 'ngx-toastr';
import { DaterangepickerConfig } from 'ng2-daterangepicker';
import { DaterangePickerComponent } from 'ng2-daterangepicker';
import { FileUploader, FileUploaderOptions, Headers, FileItem } from 'ng2-file-upload/ng2-file-upload';
//
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
  timeout: any;
  @ViewChild('postalAccountingTable') table: any; /** data table html reference */

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

    // --
    // get ready for Pallet Tags file upload (ng2-file-uploader)
    this.uploaderPalletTags.onAfterAddingFile = (file)=> {
      // disable authentication
      file.withCredentials = false;
      // update file metadata
      this.uploaderPalletTags.options.additionalParameter['pattern'] = this.pattern;
      this.uploaderPalletTags.options.additionalParameter['fileType'] = "Pallet Tags";
      this.uploaderPalletTags.options.additionalParameter['user'] = this.user;
      this.uploaderPalletTags.options.additionalParameter['clientFilePath'] = file.file.name;
      this.uploaderPalletTags.options.additionalParameter['serverFilePath'] = this.serverFilePath;
      this.uploaderPalletTags.options.additionalParameter['filePostDateTime'] = moment().format();
      this.uploaderPalletTags.options.additionalParameter['downloadCount'] = 0;
      this.uploaderPalletTags.options.additionalParameter['replacementCount'] = this.checkReplacementCount(this.pattern, file.file.name);
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
    };

    // --
    // get ready for Pallet Worksheet file upload (ng2-file-uploader)
    this.uploaderPalletWorksheets.onAfterAddingFile = (file)=> {
      // disable authentication
      file.withCredentials = false;
      // update file metadata
      this.uploaderPalletWorksheets.options.additionalParameter['pattern'] = this.pattern;
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
   * @description get the progress (%) for the current file being uploaded
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
   * @description get the progress (%) for the current file being uploaded
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
   * @description set the associated pattern for the file being uploaded
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
   * @description set the associated pattern for the file being uploaded
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
   * @description determine if the current upload button is to be enabled to allow upload
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
   * @description determine if the current upload button is to be enabled to allow upload
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
   * @param pattern
   * @param fileName
   */
  checkReplacementCount(pattern: string, fileName: string){
    // TODO: check for exiting file in database (file catalog) and filesystem; iterate replacement
    // count accordingly
    return 0;
  }

  /**
   * @method checkLettersFilter
   * @description respond to letter checkbox filter -  check event
   * @param  $event check event
   */
  checkLettersFilter($event) {
    this.isLetterFilterChecked = !this.isLetterFilterChecked;
    if (this.isFlatFilterChecked) {
      this.isFlatFilterChecked = false;
    }
    this.refreshStatusData();
  }

  /**
   * @method checkFlatsFilter
   * @description respond to flat checkbox filter -  check event
   * @param  $event check event
   */
  checkFlatsFilter($event) {
    this.isFlatFilterChecked = !this.isFlatFilterChecked;
    if (this.isLetterFilterChecked) {
      this.isLetterFilterChecked = false;
    }
    this.refreshStatusData();
  }

  /**
   * @method checkCompleteFilter
   * @description respond to flat checkbox filter -  check event
   * @param  $event check event
   */
  checkCompleteFilter($event) {
    this.isCompleteFilterChecked = !this.isCompleteFilterChecked;
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
    // filter our data
    const temp = this.temp.filter(function (d) {
      return d.pattern.toLowerCase().indexOf(val) !== -1 || !val;
    });
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
    // get all statuses from the external REST API
    var textFilter: any[] = [];
    var dateFilter: any[] = [];
    var pieceFilter: any[] = [];
    var completeFilter: any[] = [];
    this.ds.getAllStatuses().subscribe((data => {
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

      // update Pallet Tag & Worksheet upload progress array
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

      // finally, update the rows to be displayed
      this.rows = completeFilter;

      // whenever the filter changes, always go back to the first page
      this.table.offset = 0;
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
    }, 10);
  }

  /**
   * @method toggleExpandRow
   * @description toggle selected row detail view open and closed
   * @param row the selected row
   */
  toggleExpandRow(row) {
    this.table.rowDetail.toggleExpandRow(row);
  }

  /**
   * @method onDetailToggle
   * @description capture row detail toggle event
   * @param event the given toggle even
   */
  onDetailToggle(event) {
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
