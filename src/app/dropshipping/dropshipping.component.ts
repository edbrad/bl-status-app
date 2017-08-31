import { Component, OnInit } from '@angular/core';
//
import { ToastrService } from 'ngx-toastr';
//
import { LoggingService } from '../logging.service';

@Component({
  selector: 'app-dropshipping',
  templateUrl: './dropshipping.component.html',
  styleUrls: ['./dropshipping.component.css']
})
export class DropshippingComponent implements OnInit {

  constructor(private logger: LoggingService, private toastr: ToastrService) { }

  ngOnInit() {
    // log the event
    this.logger.addToLog("INFO", "Drop Shipping Component activated.").subscribe((data => {
      const ack = data;
      if (!ack){
        this.toastr.error('Logging Error!', 'bl-status: Logging Service');
      }
    }));
  }

}
