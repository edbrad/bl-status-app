import { Component, OnInit } from '@angular/core';
//
import { ToastrService } from 'ngx-toastr';
//
import { LoggingService } from '../logging.service';

@Component({
  selector: 'app-postalaccounting',
  templateUrl: './postalaccounting.component.html',
  styleUrls: ['./postalaccounting.component.css']
})
export class PostalaccountingComponent implements OnInit {

  constructor(private logger: LoggingService, private toastr: ToastrService) { }

  ngOnInit() {
    // log the event
    this.logger.addToLog("INFO", "Postal Accounting Component activated.").subscribe((data => {
      const ack = data;
      if (!ack){
        this.toastr.error('Logging Error!', 'bl-status: Logging Service');
      }
    }));
  }

}
