import { Component, OnInit } from '@angular/core';
//
import { ToastrService } from 'ngx-toastr';
//
import { LoggingService } from '../logging.service';

@Component({
  selector: 'app-sampleroom',
  templateUrl: './sampleroom.component.html',
  styleUrls: ['./sampleroom.component.css']
})
export class SampleroomComponent implements OnInit {

  constructor(private logger: LoggingService, private toastr: ToastrService) { }

  ngOnInit() {
     // log the event
     this.logger.addToLog("INFO", "Sample Room Component activated.").subscribe((data => {
      const ack = data;
      if (!ack){
        this.toastr.error('Logging Error!', 'bl-status: Logging Service');
      }
    }));
  }

}
