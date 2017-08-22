import { Component, OnInit, ViewEncapsulation, ViewChild } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map'
import { DataService } from '../data.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  rows = [];

  temp = [];

  columns = [
    { prop: 'pattern' },
    { prop: 'project' },
    { prop: 'mailClass' },
    { prop: 'sampleStatus'},
    { prop: 'paperworkStatus'},
    { prop: 'type'},
    { prop: 'dropDate'}
  ];

  data = [];
  expanded: any = {};
  timeout: any;

  constructor(private ds: DataService, private toastr: ToastrService) {
    this.temp = this.rows;
  }

  // table html reference
  @ViewChild('homeTable') table: any;

  ngOnInit() {
    /** get a stats from the external REST API */
    this.ds.getAllStatuses().subscribe((data => {
      this.rows = data;
      this.temp = [...data];
      console.log("API Get All Statuses Call: " + JSON.stringify(this.rows));
    }));

  }

  updatePatternFilter(event) {
    const val = event.target.value.toLowerCase();

    // filter our data
    const temp = this.temp.filter(function(d) {
      return d.pattern.toLowerCase().indexOf(val) !== -1 || !val;
    });

    // update the rows
    this.rows = temp;
    // Whenever the filter changes, always go back to the first page
    this.table.offset = 0;

  }

  onPage(event) {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      console.log('paged!', event);
    }, 100);
  }

  toggleExpandRow(row) {
    console.log('Toggled Expand Row!', row);
    this.table.rowDetail.toggleExpandRow(row);
  }

  onDetailToggle(event) {
    console.log('Detail Toggled', event);
}

}
