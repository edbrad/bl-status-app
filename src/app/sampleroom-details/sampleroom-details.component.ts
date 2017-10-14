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
import { SelectModule } from 'ng2-select';

// custom services
import { LoggingService } from '../logging.service';
import { AuthenticationService } from '../auth/auth.service';
import { DataService } from '../data.service';

@Component({
  selector: 'app-sampleroom-details',
  templateUrl: './sampleroom-details.component.html',
  styleUrls: ['./sampleroom-details.component.css']
})
export class SampleroomDetailsComponent implements OnInit {

  // misc variables
  private subscription: any;      /** the Observable subscription to the routing Service */
  public isDataLoaded: boolean = false;  /** data loading flag - for loading animation */
  public isSampleIssueChecked: boolean = false;  /** SampleRoom Issue flag */
  public user = this.authenticationService.getUsername();

  // selected pattern's details
  public patternCode: string = "";        /** current Pattern Code */
  public patternData: any = {};           /** current Patern data */
  public sampleRoomNotes: string = "";    /** storage for current Pattern Notes/Issues (for updates) */
  public status: string = "";             /** current Pattern status */

  // modal window reference
  public modalRef: BsModalRef;

  public statuses: Array<string> =  ["New", "In Process", "Complete"];

  // API url
  public urlRoot: string = 'http://172.16.248.19:8080/api'; // test
  //urlRoot: string = 'http://172.16.248.19:8080/api'; // prod

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

  ngOnInit() {
    /** get the given pattern (9999-99X) to be displayed from the incoming route parameters */
    this.subscription = this.route.params.subscribe(params => { this.patternCode = params['pattern'] });
    // get the given pattern data
    this.getPatternData(this.patternCode);
    // log the event
    this.logger.addToLog("INFO", "Sample Room Pattern Details Component activated.").subscribe((data => {
      const ack = data;
      if (!ack){
        this.toastr.error('Logging Error!', 'bl-status: Logging Service');
      }
    }));
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
      this.sampleRoomNotes = this.patternData.sampleRoomNotes;
      this.status = this.patternData.sampleStatus;
      // clear loading indicator
      this.isDataLoaded = true;
      // check if there is an existing issue and set status
      if (this.status == "Issue"){
        this.isSampleIssueChecked = true;
      }
      else{
        this.isSampleIssueChecked = false;
      }
    }))
  }

  /**
   * @method editSampleNotes
   * @description activate the Modal window for editing/updating Postal Sample room notes
   * @param {TemplateRef} template a reference to the HTML template content for the Modal window
   */
  public editSampleNotes(template: TemplateRef<any>) {
    this.modalRef = this.modalService.show(template);
  }

  /**
   * @method saveAccountingNotes
   * @desc save Postal Accounting Notes/Issues to the database
   */
  public saveSampleNotes(){
    // set Note and Status update data
    var data = {};
    if (this.isSampleIssueChecked) {
      data = {
        "sampleRoomNotes": this.sampleRoomNotes,
        "sampleStatus": "Issue"
      };
    } else {
      data = {
        "sampleRoomNotes": this.sampleRoomNotes,
        "sampleStatus": "In Process"
      };
    }
    var response = this.ds.updateStatusByPattern(this.patternData.pattern, data)
    .subscribe((data => {
      //console.log("Note response: " + response);
      this.getPatternData(this.patternCode);
      // log the event
      this.logger.addToLog("INFO", "Sample Rooom Notes Updated: " +
      this.sampleRoomNotes +
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
      this.toastr.success('Sample Status Updated!', 'bl-status: Data Service');
    }))
  }

  /**
   * @method clearSampleRoomNotes
   * @desc clear Sample Notes/Issues
   */
  public clearSampleRoomNotes(){
    this.sampleRoomNotes = "";
    this.isSampleIssueChecked = false;
  }

  /**
   * @method checkSampleIssue
   * @desc check/uncheck Issue flag checkbox
   */
  public checkSampleIssue(){
    this.isSampleIssueChecked = !this.isSampleIssueChecked;
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
   *
   * @param value
   */
  statusSelected(value: any){
    var newStatus = value.text;
    var wrkStatus = "";
    // set Status and update data
    var data = {};
    if (!this.isSampleIssueChecked) {
      data = {
        "sampleStatus": newStatus
      };
      wrkStatus = newStatus
    } else{
      data = {
        "sampleStatus": this.status
      };
      wrkStatus = this.status
    }
    var response = this.ds.updateStatusByPattern(this.patternData.pattern, data)
    .subscribe((data => {
      //console.log("Note response: " + response);
      this.getPatternData(this.patternCode);
      // log the event
      this.logger.addToLog("INFO", "Sample Status Updated: " +
      wrkStatus +
      " User: " + this.user).subscribe((data => {
          const ack = data;
          if (!ack) {
            this.toastr.error('Logging Error!', 'bl-status: Logging Service');
          }
        }));

      // done
      if (this.isSampleIssueChecked) {
        this.toastr.error('ISSUE MUST BE CLEARED BEFORE UPDATING STATUS!', 'bl-status: Data Service');
      } else{
        this.toastr.success('Sample Room Notes Updated!', 'bl-status: Data Service');
      }
    }))
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
