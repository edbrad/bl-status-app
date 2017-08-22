import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  rows = [
    { pattern: '1001-01A', desc: 'Some RWT Job', dropDate: '09/01/2017' },
    { pattern: '1002-01A', desc: 'Mega Reatil Mailing XX', dropDate: '09/02/2017' },
    { pattern: '1003-01A', desc: 'Super Duper Campaign', dropDate: '09/03/2017' },
    { pattern: '1004-01A', desc: 'Bank For Me Loans', dropDate: '09/04/2017' },
    { pattern: '1005-01A', desc: 'Termabug Monthly Mailing', dropDate: '10/01/2017' },
    { pattern: '1006-01A', desc: 'St. Jane Charities', dropDate: '10/05/2017' },
    { pattern: '1007-01A', desc: 'Politial Campaign', dropDate: '11/01/2017' },
    { pattern: '1008-01A', desc: 'Science Explorer', dropDate: '01/08/2018' },
    { pattern: '1009-01A', desc: 'Journey Magazine', dropDate: '11/02/2017' },
    { pattern: '1010-01A', desc: 'Formal Notifications', dropDate: '12/09/2017' },
    { pattern: '1011-01A', desc: 'General Education', dropDate: '08/30/2017' },
    { pattern: '1012-01A', desc: 'Super Equity Financial', dropDate: '10/02/2017' },
    { pattern: '1013-01A', desc: 'InsureMe August Campaign', dropDate: '09/30/2017' },
    { pattern: '1014-01A', desc: 'Paws Up Charities', dropDate: '09/14/2017' },
    { pattern: '1015-01A', desc: 'Ultra Cosmetics', dropDate: '09/11/2017' },
    { pattern: '1016-01A', desc: 'DAB Drop 0801-92', dropDate: '09/21/2017' },
    { pattern: '1017-01A', desc: 'The Best Offers Campaign', dropDate: '09/14/2017' },
    { pattern: '1018-01A', desc: 'SafeLife Insurance - Annual New Busines Drop 2', dropDate: '09/19/2017' },
    { pattern: '1019-01A', desc: 'OfferNow - Second Offer News', dropDate: '09/20/2017' },
    { pattern: '1020-01A', desc: 'InterWebs - Online Solicitation', dropDate: '09/21/2017' },
    { pattern: '1021-01A', desc: 'Over-Done Steaks', dropDate: '09/09/2017' },
    { pattern: '1022-01A', desc: 'Slash 45 Ranch', dropDate: '09/22/2017' },
  ];

  temp = [];

  columns = [
    { prop: 'pattern' },
    { name: 'Desc' },
    { name: 'Drop Date' }
  ];

  constructor() {
    this.temp = this.rows;
  }

  updateFilter(event) {
    const val = event.target.value.toLowerCase();

    // filter our data
    const temp = this.temp.filter(function(d) {
      return d.name.toLowerCase().indexOf(val) !== -1 || !val;
    });

    // update the rows
    this.rows = temp;
    // Whenever the filter changes, always go back to the first page
    //this.table.offset = 0;
  }

  ngOnInit() {
  }

}
