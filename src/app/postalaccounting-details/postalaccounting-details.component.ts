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

  private subscription: any;    /** the Observable subscription to the routing Service */

  // selected pattern's details
  patternCode: string = "";
  patternData: any = {};
  postalAccountingNotes: string = "";
  status: string = "";

  // modal window reference
  public modalRef: BsModalRef;

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
  palletTagUploadProgress: any = 0;
  palletWorksheetUploadProgress: any = 0;
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

  // component constructor
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
      this.uploaderPalletTags.removeFromQueue(item);
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
      this.uploaderPalletWorksheets.removeFromQueue(item);
      this.getPatternData(this.patternCode);
    };
  }

  /**
   * @method getPatternData
   * @description get latest pattern status document from database
   * @param pattern EMS pattern code (9999-99X)
   */
  getPatternData(pattern: string){
    // get all statuses from the external REST API
    this.ds.getAPattern(pattern).subscribe((data => {
      // hold data from database
      this.patternData = data;
      this.postalAccountingNotes = this.patternData.postalAccountingNotes;
      this.status = this.patternData.paperworkStatus;
      console.log("pattern data: " + JSON.stringify(this.patternData));
    }))
  }

  /**
   * @method uploadPalletTags
   * @description invoke the ng-file-uploader - upload process
   */
  uploadPalletTags(){
    this.currentPalletTagPattern = this.patternCode;
    this.uploaderPalletTags.uploadAll();
  }

   /**
   * @method uploadPalletWorksheet
   * @description invoke the ng-file-uploader - upload process
   */
  uploadPalletWorksheet(){
    this.currentWorksheetPattern = this.patternCode;
    this.uploaderPalletWorksheets.uploadAll();
  }

  /**
   * @method getPalletTagProgress
   * @description get the progress (%) for the current file being uploaded (tracked in array)
   */
  getPalletTagProgress() {
    var progress: number = 0;
    progress = this.palletTagUploadProgress;
    return progress;
  }

  /**
   * @method getPalletWorksheetProgress
   * @description get the progress (%) for the current file being uploaded (tracked in array)
   */
  getPalletWorksheetProgress() {
    var progress: number = 0;
    progress = this.palletWorksheetUploadProgress;
    return progress;
  }

  /**
   * @method enablePalletTagsUpload
   * @description determine if the current upload button is to be enabled to
   * allow upload - an input file must be selected
   */
  enablePalletTagsUpload(pattern: string){
    if (this.uploaderPalletTags.getNotUploadedItems().length > 0){
      return false;
    }
    else{
      return true;
    }
  }

  /**
   * @method enablePalletWorksheetUpload
   * @description determine if the current upload button is to be enabled to
   * allow upload - an input file must be selected
   */
  enablePalletWorksheetUpload(){
    if (this.uploaderPalletWorksheets.getNotUploadedItems().length > 0){
      return false;
    }
    else{
      return true;
    }
  }

  /**
   * @method checkReplacementCount
   * @description check for existing file and return the replacement count
   * @param fileType the given file type to check (Pallet/Worksheet)
   */
  checkReplacementCount(fileType: string) {
    if (fileType == "Pallet Tags") {
      if ((this.patternData.currentPalletTagFile != "") && (this.patternData.currentPalletTagFile != " ")) {
        // log the event
        this.toastr.warning('You are about to replace File: ' + this.patternData.currentPalletTagFile + '! ', 'bl-status: FileUploader');
        // return the updated replacement count
        console.log("new count: " + parseInt(this.patternData.palletTagReplacementCount) + 1);
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
   * @description enable Pallet File PDF delete button, if there is a file associated w/ given pattern
   */
  enablePalletTagsDelete(){
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
   * @description enable Worksheet File PDF delete button, if there is a file associated w/ given pattern
   */
  enablePalletWorksheetDelete(){
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
   * @description delete Pallet Tag PDF file associated w/ given pattern
   */
  deletePalletPDF() {
    console.log("Delete Pallet PDF!");
    var response = this.ds.deletePalletPDF(this.patternCode, this.patternData.currentPalletTagFile)
      .subscribe((data => {
        console.log("Delete response: " + response);
        this.getPatternData(this.patternCode);
        // log the event
        this.logger.addToLog("INFO", "Pallet PDF File Deleted - File: " +
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
   * @description delete Worksheet PDF file associated w/ given pattern
   */
  deleteWorkSheetPDF(){
    console.log("Delete Worksheet PDF!");
    var response = this.ds.deleteWorksheetPDF(this.patternCode, this.patternData.currentPalletWorksheetFile)
      .subscribe((data => {
        console.log("Delete response: " + response);
        this.getPatternData(this.patternCode);
        // log the event
        this.logger.addToLog("INFO", "Worksheet PDF File Deleted - File: " +
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
   * @param template a reference to the HTML template content for the Modal window
   */
  public editAccountingNotes(template: TemplateRef<any>) {
    this.modalRef = this.modalService.show(template);
  }

  /**
   *
   */
  public saveAccountingNotes(){
    console.log("notes: " + this.postalAccountingNotes);
    var data = {
      "postalAccountingNotes" : this.postalAccountingNotes
    }
    var response = this.ds.updateStatusByPattern(this.patternData.pattern, data)
    .subscribe((data => {
      console.log("Note response: " + response);
      this.getPatternData(this.patternCode);
      // log the event
      this.logger.addToLog("INFO", "Postal Accouting Notes Updated: " +
      this.postalAccountingNotes +
      " User: " + this.user).subscribe((data => {
          const ack = data;
          if (!ack) {
            this.toastr.error('Logging Error!', 'bl-status: Logging Service');
          }
        }));
      this.modalRef.hide()
      this.toastr.success('Postal Accouting Notes Updated!', 'bl-status: Data Service');
      this.getPatternData(this.patternCode);
    }))
  }

  /**
   *
   */
  clearPostalAccoutingNotes(){
    this.postalAccountingNotes = "";
  }

  /**
   *
   */
  refreshPatternData(){
    this.getPatternData(this.patternCode);
  }

  /**
   *
   * @param status
   */
  checkBadgeProgress(status: string){
    console.log("status: " + status);
    console.log("paperwork status: " + this.status);
    if (this.status == status){
      console.log("return: false");
      return 0;
    } else {
      console.log("return: true");
      return 1;
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

