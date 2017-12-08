declare var moment: any;  /** prevent TypeScript typings error when using non-TypeSCript Lib (momentJS) */
// Angular 2/4 native libraries
import { Component, OnInit, OnDestroy } from '@angular/core';
import { TemplateRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from "rxjs/Observable";

// 3rd-party/open-source components
import { ToastrService } from 'ngx-toastr';
import { FileUploader, FileUploaderOptions, Headers, FileItem } from 'ng2-file-upload/ng2-file-upload';
import { BsModalService } from 'ngx-bootstrap/modal';
import { BsModalRef } from 'ngx-bootstrap/modal/modal-options.class';

// custom services
import { LoggingService } from '../logging.service';
import { AuthenticationService } from '../auth/auth.service';
import { DataService } from '../data.service';

@Component({
  selector: 'app-postalaccounting-details',
  templateUrl: './postalaccounting-details.component.html',
  styleUrls: ['./postalaccounting-details.component.css']
})
export class PostalaccountingDetailsComponent implements OnInit, OnDestroy {

  // misc variables
  private subscription: any;      /** the Observable subscription to the routing Service */
  public isDataLoaded: boolean = false;  /** data loading flag - for loading animation */
  public isAccountingIssueChecked: boolean = false;  /** PostalAccouting Issue flag */

  // selected pattern's details
  public patternCode: string = "";       /** current Pattern Code */
  public patternData: any = {};          /** current Patern data */
  public postalAccountingNotes: string = ""; /** storage for current Pattern Notes/Issues (for updates) */
  public status: string = "";            /** current Pattern status */

  // modal window reference
  public modalRef: BsModalRef;

  // file upload metadata fields (stored in db - file catalog - for download reference)
  public pattern = "";
  public fileType = "";
  public user = this.authenticationService.getUsername();
  public clientFilePath = "";
  public serverFilePath = "";
  public filePostDateTime = moment().format();
  public downloadCount = 0;
  public replacementCount = 0;

  // file upload progress fields
  public palletTagUploadProgress: any = 0;
  public palletWorksheetUploadProgress: any = 0;
  public currentPalletTagPattern: string = "";
  public currentWorksheetPattern: string = "";

  // API url
  //public urlRoot: string = 'http://172.16.248.19:8080/api'; // test
  public urlRoot: string = 'http://172.16.168.210:8080/api'; // test 2
  //urlRoot: string = 'http://172.16.248.19:8080/api'; // prod

  // intialize Pallet Tag file uploader instance
  public uploaderPalletTags: FileUploader = new FileUploader({
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
  public uploaderPalletWorksheets: FileUploader = new FileUploader({
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

  /**
   * @constructor
   * @param route the current route information
   * @param logger logging service dependency
   * @param ds data service dependency
   * @param toastr pop-up service dependency
   * @param authenticationService user authentication service dependency
   * @param modalService modal window service dependency
   */
  constructor(
    private route: ActivatedRoute,
    private logger: LoggingService,
    private ds: DataService,
    private toastr: ToastrService,
    private authenticationService: AuthenticationService,
    private modalService: BsModalService,
  ) { }

  /**
   * @method ngOnInit
   * @description Component initialization
   */
  ngOnInit() {
    /** get the given pattern (9999-99X) to be displayed from the incoming route parameters */
    this.subscription = this.route.params.subscribe(params => { this.patternCode = params['pattern'] });
    // get the given pattern data
    this.getPatternData(this.patternCode);
    // log the event
    this.logger.addToLog("SUCCESS", "Postal Accounting Pattern Details Component activated.").subscribe((data => {
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
      this.uploaderPalletTags.options.additionalParameter['pattern'] = this.patternCode;
      this.uploaderPalletTags.options.additionalParameter['fileType'] = "Pallet Tags";
      this.uploaderPalletTags.options.additionalParameter['user'] = this.user;
      this.uploaderPalletTags.options.additionalParameter['clientFilePath'] = file.file.name;
      this.uploaderPalletTags.options.additionalParameter['serverFilePath'] = this.serverFilePath;
      this.uploaderPalletTags.options.additionalParameter['filePostDateTime'] = moment().format();
      this.uploaderPalletTags.options.additionalParameter['downloadCount'] = 0;
      this.uploaderPalletTags.options.additionalParameter['replacementCount'] = this.checkReplacementCount("Pallet Tags");
    };

    // override Pallet Tags progress bar method - to set progress for the appropriate pattern
    this.uploaderPalletTags.onProgressItem = (fileItem: FileItem, progress: any) => {
      this.palletTagUploadProgress = this.uploaderPalletTags.progress;
    };

    // post Pallet Tags file upload processing
    this.uploaderPalletTags.onCompleteItem = (item: any, response: any, status: any, headers: any) => {
      this.toastr.success('File Uploaded!', 'bl-status: FileUploader');
      // clear file from uploader
      this.uploaderPalletTags.removeFromQueue(item);
      // refresh data (update UI)
      this.getPatternData(this.patternCode);
    };

    // -- Pallet Worksheet Uploader event hooks
    // get ready for Pallet Worksheet file upload (ng2-file-uploader)
    this.uploaderPalletWorksheets.onAfterAddingFile = (file)=> {
      // disable authentication
      file.withCredentials = false;
      // update file metadata
      this.uploaderPalletWorksheets.options.additionalParameter['pattern'] = this.patternCode;
      this.uploaderPalletWorksheets.options.additionalParameter['fileType'] = "Pallet Worksheet";
      this.uploaderPalletWorksheets.options.additionalParameter['user'] = this.user;
      this.uploaderPalletWorksheets.options.additionalParameter['clientFilePath'] = file.file.name;
      this.uploaderPalletWorksheets.options.additionalParameter['serverFilePath'] = this.serverFilePath;
      this.uploaderPalletWorksheets.options.additionalParameter['filePostDateTime'] = moment().format();
      this.uploaderPalletWorksheets.options.additionalParameter['downloadCount'] = 0;
      this.uploaderPalletWorksheets.options.additionalParameter['replacementCount'] = this.checkReplacementCount("Pallet Worksheet");
    };

    // override Pallet Worksheet progress bar method - to set progress for the appropriate pattern
    this.uploaderPalletWorksheets.onProgressItem = (fileItem: FileItem, progress: any) => {
      this.palletWorksheetUploadProgress = this.uploaderPalletWorksheets.progress;
    };

    // post Pallet Worksheet file upload processing
    this.uploaderPalletWorksheets.onCompleteItem = (item: any, response: any, status: any, headers: any) => {
      this.toastr.success('File Uploaded!', 'bl-status: FileUploader');
      // clear file from uploader
      this.uploaderPalletWorksheets.removeFromQueue(item);
      // refresh data (update UI)
      this.getPatternData(this.patternCode);
    };
  }

  /**
   * @method getPatternData
   * @desc get latest pattern status document from database
   * @param {string} pattern EMS pattern code (9999-99X)
   */
  public getPatternData(pattern: string){
    // use data service to get pattern data from the database, via external REST API
    this.ds.getAPattern(pattern).subscribe((data => {
      // hold data from database
      this.patternData = data;
      this.postalAccountingNotes = this.patternData.postalAccountingNotes;
      this.status = this.patternData.paperworkStatus;
      // clear loading indicator
      this.isDataLoaded = true;
      // check if there is an existing issue and set status
      if (this.status == "Issue"){
        this.isAccountingIssueChecked = true;
      }
      else{
        this.isAccountingIssueChecked = false;
      }
    }))
  }

  /**
   * @method uploadPalletTags
   * @desc invoke the ng-file-uploader - upload process
   */
  public uploadPalletTags(){
    this.currentPalletTagPattern = this.patternCode;
    this.uploaderPalletTags.uploadAll();
  }

   /**
   * @method uploadPalletWorksheet
   * @desc invoke the ng-file-uploader - upload process
   */
  public uploadPalletWorksheet(){
    this.currentWorksheetPattern = this.patternCode;
    this.uploaderPalletWorksheets.uploadAll();
  }

  /**
   * @method getPalletTagProgress
   * @desc get the progress (%) for the current file being uploaded (tracked in array)
   */
  public getPalletTagProgress() {
    var progress: number = 0;
    progress = this.palletTagUploadProgress;
    return progress;
  }

  /**
   * @method getPalletWorksheetProgress
   * @desc get the progress (%) for the current file being uploaded (tracked in array)
   */
  public getPalletWorksheetProgress() {
    var progress: number = 0;
    progress = this.palletWorksheetUploadProgress;
    return progress;
  }

  /**
   * @method enablePalletTagsUpload
   * @desc determine if the current upload button is to be enabled to
   * allow upload - an input file must be selected
   */
  public enablePalletTagsUpload(){
    if (this.uploaderPalletTags.getNotUploadedItems().length > 0){
      return false;
    }
    else{
      return true;
    }
  }

  /**
   * @method enablePalletWorksheetUpload
   * @desc determine if the current upload button is to be enabled to
   * allow upload - an input file must be selected
   */
  public enablePalletWorksheetUpload(){
    if (this.uploaderPalletWorksheets.getNotUploadedItems().length > 0){
      return false;
    }
    else{
      return true;
    }
  }

  /**
   * @method checkReplacementCount
   * @desc check for existing file and return the replacement count
   * @param {string} fileType the given file type to check (Pallet/Worksheet)
   */
  public checkReplacementCount(fileType: string) {
    if (fileType == "Pallet Tags") {
      if ((this.patternData.currentPalletTagFile != "") && (this.patternData.currentPalletTagFile != " ")) {
        // log the event
        this.toastr.warning('You are about to replace File: ' + this.patternData.currentPalletTagFile + '! ', 'bl-status: FileUploader');
        // return the updated replacement count
        //console.log("new count: " + parseInt(this.patternData.palletTagReplacementCount) + 1);
        return parseInt(this.patternData.palletTagReplacementCount) + 1;
      } else {
        return 0;
      }
    } else {
      if ((this.patternData.currentPalletWorksheetFile != "") && (this.patternData.currentPalletWorksheetFile != " ")) {
        // log the event
        this.toastr.warning('You are about to replace File: ' + this.patternData.currentPalletWorksheetFile + '! ', 'bl-status: FileUploader');
        // return the updated replacement count
        return parseInt(this.patternData.palletWorksheetReplacementCount) + 1;
      } else {
        return 0;
      }
    }
  }

  /**
   * @method enablePalletTagsDelete
   * @desc enable Pallet File PDF delete button, if there is a file associated w/ given pattern
   */
  public enablePalletTagsDelete(){
    if ((this.patternData.currentPalletTagFile != "") &&
    (this.patternData.currentPalletTagFile != " ")){
      return false;
    }
    else{
      return true;
    }
  }

  /**
   * @method enablePalletWorksheetDelete
   * @desc enable Worksheet File PDF delete button, if there is a file associated w/ given pattern
   */
  public enablePalletWorksheetDelete(){
    if ((this.patternData.currentPalletWorksheetFile != "") &&
    (this.patternData.currentPalletWorksheetFile != " ")){
      return false;
    }
    else{
      return true;
    }
  }

  /**
   * @method deletePalletPDF
   * @desc delete Pallet Tag PDF file associated w/ given pattern
   */
  public deletePalletPDF() {
    //console.log("Delete Pallet PDF!");
    var response = this.ds.deletePalletPDF(this.patternCode, this.patternData.currentPalletTagFile)
      .subscribe((data => {
        //console.log("Delete response: " + response);
        this.getPatternData(this.patternCode);
        // log the event
        this.logger.addToLog("SUCCESS", "Pallet PDF File Deleted - File: " +
          this.patternData.currentPalletTagFile + " Pattern: " +
          this.patternCode + " User: " + this.user).subscribe((data => {
            const ack = data;
            if (!ack) {
              this.toastr.error('Logging Error!', 'bl-status: Logging Service');
            }
          }));
        this.toastr.success('Pallet PDF File Deleted!', 'bl-status: Data Service');
      }))
  }

  /**
   * @method deleteWorkSheetPDF
   * @desc delete Worksheet PDF file associated w/ given pattern
   */
  public deleteWorkSheetPDF(){
    //console.log("Delete Worksheet PDF!");
    var response = this.ds.deleteWorksheetPDF(this.patternCode, this.patternData.currentPalletWorksheetFile)
      .subscribe((data => {
        //console.log("Delete response: " + response);
        this.getPatternData(this.patternCode);
        // log the event
        this.logger.addToLog("SUCCESS", "Worksheet PDF File Deleted - File: " +
          this.patternData.currentPalletWorksheetFile + " Pattern: " +
          this.patternCode + " User: " + this.user).subscribe((data => {
            const ack = data;
            if (!ack) {
              this.toastr.error('Logging Error!', 'bl-status: Logging Service');
            }
          }));
        this.toastr.success('Worksheet PDF File Deleted!', 'bl-status: Data Service');
      }))
  }

  /**
   * @method editAccountingNotes
   * @description activate the Modal window for editing/updating Postal Accounting notes
   * @param {TemplateRef} template a reference to the HTML template content for the Modal window
   */
  public editAccountingNotes(template: TemplateRef<any>) {
    this.modalRef = this.modalService.show(template);
  }

  /**
   * @method saveAccountingNotes
   * @desc save Postal Accounting Notes/Issues to the database
   */
  public saveAccountingNotes(){
    // set Note and Status update data
    var data = {};
    if (this.isAccountingIssueChecked) {
      data = {
        "postalAccountingNotes": this.postalAccountingNotes,
        "paperworkStatus": "Issue"
      };
    } else if ((this.patternData.currentPalletTagFile != "") &&
      (this.patternData.currentPalletTagFile != " ") &&
      (this.patternData.currentPalletWorksheetFile != "") &&
      (this.patternData.currentPalletWorksheetFile != " ")) {
      data = {
        "postalAccountingNotes": this.postalAccountingNotes,
        "paperworkStatus": "Complete"
      };
    } else {
      data = {
        "postalAccountingNotes": this.postalAccountingNotes,
        "paperworkStatus": "In Process"
      };
    }
    var response = this.ds.updateStatusByPattern(this.patternData.pattern, data)
    .subscribe((data => {
      //console.log("Note response: " + response);
      this.getPatternData(this.patternCode);
      // log the event
      this.logger.addToLog("SUCCESS", "Postal Accouting Notes Updated: " +
      this.postalAccountingNotes +
      " User: " + this.user).subscribe((data => {
          const ack = data;
          if (!ack) {
            this.toastr.error('Logging Error!', 'bl-status: Logging Service');
          }
        }));

      // close the Modal
      this.modalRef.hide()

      // refresh the data
      this.getPatternData(this.patternCode);

      // done
      this.toastr.success('Postal Accouting Notes Updated!', 'bl-status: Data Service');
    }))
  }

  /**
   * @method clearPostalAccoutingNotes
   * @desc clear Postal Accouting Notes/Issues
   */
  public clearPostalAccoutingNotes(){
    this.postalAccountingNotes = "";
    this.isAccountingIssueChecked = false;
  }

  /**
   * @method checkAccountingIssue
   * @desc check/uncheck Issue flag checkbox
   */
  public checkAccountingIssue(){
    this.isAccountingIssueChecked = !this.isAccountingIssueChecked;
  }

  /**
   * @method refreshPatternData
   * @desc get latest pattern data from the database
   */
  public refreshPatternData(){
    this.getPatternData(this.patternCode);
  }

  /**
   * @method checkBadgeStatus
   * @desc display/hide status badges based on given pattern's status
   * @param {string} status the given pattern's status
   */
  public checkBadgeStatus(status: string){
    if (this.status == status){
      return true;
    } else {
      return false;
    }
  }

  /**
   * @method ngOnDestroy
   * @description Component memory clean-up
   */
  ngOnDestroy() {
    /** dispose of any active subsriptions to prevent memory leak */
    this.subscription.unsubscribe();
  }
}

