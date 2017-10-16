import { Component, OnInit } from '@angular/core';
//
import { ToastrService } from 'ngx-toastr';
import { TabsetComponent } from 'ngx-bootstrap';
//
import { LoggingService } from '../logging.service';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {



  constructor(private logger: LoggingService, private toastr: ToastrService) { }

  ngOnInit() {
     // log the event
     this.logger.addToLog("INFO", "Admin Component activated.").subscribe((data => {
      const ack = data;
      if (!ack){
        this.toastr.error('Logging Error!', 'bl-status: Logging Service');
      }
    }));
  }



}
