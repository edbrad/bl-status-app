# bl-status-app: *Box Loading Status - Front-End Web Client Application*

## Overview
**bl-status-app** provides a web-based interface for end users the the **BL-STATUS** system.  It allows users to manage and track the status of Mailpiece samples (from the Sample Room) and Pallet Paperwork (from Accounting), which are critical to the Box Loading Department in order to begin building Drop-Ship Pallets.  It is a ***Single Page Application*** (a.k.a "SPA") that asychronusly exchanges data with a back-end database (**MongoDB**) via a RESTful Web API endpoint (*bl-status-api.emsmail.com*). The diagram below shows how the web application fits into the overall architecture of the bl-status system:

![bl-status Architecture Overview Diagram](./images/BL-STATUS-APP_OverviewDiagram.png)

The primary framework used to build this application is Google's **Angular** Open Source Front-end Javascript Framework(http://angular.io). More specifically, the application utilizes the **Angular 4** version of the framework (*a semantic versioning reset of Angular 2*). Angular 2/4 represents a major departure from the original *AngularJS* framework (a.k.a Angular 1 - which is still widely used and supported). There are other additional Javascript and CSS libraries/packages being utilized to build this application:

* **ngx-bootstrap**: An Angular-compatible port of the popular **Twitter Boostrap CSS framework** (https://github.com/valor-software/ngx-bootstrap) - provides styling for the UI look-and-feel 
* **ngx-datatable**: An Angular-compatible port of the popular **jQuery DataTables Javascript framework** (https://github.com/swimlane/ngx-datatable) - for displaying Status entry lists 
* **ng2-charts**: An Angular-compatible port of the popular **Charts.JS Javascript framework** (https://valor-software.com/ng2-charts/) - for displaying
* **ng2-daterangepicker**: A programmable Angular component library for graphically selecting a date range (https://github.com/evansmwendwa/ng2-daterangepicker)
* **ng2-file-upload**: A programmable Angular component library for uploading a file to a url endpoint (https://github.com/valor-software/ng2-file-upload)
* **ngx-toastr**: An Angular-compatible port of the popular **Toastr Javascript framework** (https://github.com/scttcper/ngx-toastr) - for displaying pop-up messages 
* **ng2-select**: A programmable Angular component library for a drop-down selector (https://valor-software.com/ng2-select/)
* **ngx-loading**: A programmable Angular component library for displaying a loading animation during long-running I/O events (https://www.npmjs.com/package/ngx-loading)
* **file-saver**: A programmable Angular component library for invoking the given Browser's native file saver API (https://github.com/eligrey/FileSaver.js) - used to dowload posted PDF's from the server
* **momentJS**: A popular Javascript library for working with dates and times (https://momentjs.com/)
* **pdfmake**: A popular Javascript libary for generating PDF's (http://pdfmake.org/)
* **font-awesome**: A popular CSS framework for displaying various fonts and icons (http://fontawesome.io/)

### Status Schema
The backend document-based database (*MongoDB*) has no inherent schema requirement.  Documents do not all have to have the same fields.  This provides flexibility as the application(s) it supports evolves.  However, in this application, we will imply a logical schema to provide a consistant, agreed upon model of the status information that is being managed. below is the list of data fields that will be managed.  This data partially provided by the List Processing **QualToPDF** .NET application. This data comes from the the supporting MSSQL database (*vm-sqlsvr-02.EMSProjects*)  Other fields will be provided and initialized by the backend API:

| Field Name    | Description   | Source  |
| ------------- |---------------| --------|
| **qualID**        | internal Presort Qualification ID code      | *QualToPDF* - (SQL **quals** table) |
| **projectID**     | internal List Processing project ID code    | *QualToPDF* - (SQL **quals** table) |
| **total**         | Total Record/Piece Count                    | *QualToPDF* - (SQL **quals** table) |
| **presort**       | Total Presorted output Count                | *QualToPDF* - (SQL **quals** table) |
| **fail**          | Failed Presort record/piece count (invalid/bad zip code data) | *QualToPDF* - (SQL **quals** table) |
| **spr**           | Single Piece (First Class) record/piece count | *QualToPDF* - (SQL **quals** table) |
| **class**         | USPS Class of mail (3rd/1st/2nd)            | *QualToPDF* - (SQL **quals** table) |
| | * *stored as **mailClass** in MongoDB - **class** is a Python reserved word* | |
| **type**          | Mail piece type (Letter/Flat/Postcard)      | *QualToPDF* - (SQL **quals** table) |
| **specs**         | Mail piece specifications (HxWxD, weight, Mail.dat Ver.)  | *QualToPDF* - (SQL **quals** table) |
| **counts**        | CSV-formatted counts for Legacy Job Ticket Import  | *QualToPDF* - (SQL **quals** table) |
| **isCurrent**     | Is this the most current version of the Prosort?  | *QualToPDF* - (SQL **quals** table) |
| **fileStamp**     | Date/Time Stamp of Presorted output File    | *QualToPDF* - (SQL **quals** table) |
| **timeStamp**     | Data/Time Stamp of the qual table row       | *QualToPDF* - (SQL **quals** table) |
| **isSampleComplete**| Sample completion flag (placeholder)      | *QualToPDF* - (SQL **quals** table) |
| **sampleStamp**   | Sample completion Date/Time Stamp           | *QualToPDF* - (SQL **quals** table) |
| **isAcctComplete** | Postal Accouting Papwork completion flag (placeholder) | *QualToPDF* - (SQL **quals** table) |
| **AcctStamp**     | Postal Accounting Date/Time Stamp           | *QualToPDF* - (SQL **quals** table) |
| **trayMax**       | Maximum number of pieces per container (Tray/Sack)  | *QualToPDF* - (SQL **quals** table) |
| **dpUser**        | Data Processing/List Processing Network user name | *QualToPDF* - (SQL **quals** table) |
| **sasUser**       | Sample Room Employee name/code              | *QualToPDF* - (SQL **quals** table) |
| **acctUser**      | Postal Accounting Employee name/code        | *QualToPDF* - (SQL **quals** table) |
| **isEpop**        | Is this an EPOP Pattern                     | *QualToPDF* - (SQL **quals** table) |
| **isTagsComplete**| Are Trag/Sack Tags complete?                | *QualToPDF* - (SQL **quals** table) |
| **TagsStamp**     | Tray/Sack Tags printed?                     | *QualToPDF* - (SQL **quals** table) |
| **tagsUser**      | Print room Employee name/code               | *QualToPDF* - (SQL **quals** table) |
| **hasCRRT**       | Does Presort contain CAR-RT pieces          | *QualToPDF* - (SQL **quals** table) |
| **hasOrigin**     | Does Presort contain Origin-SCF/NDC pieces  | *QualToPDF* - (SQL **quals** table) |
| **hasOrigin**     | Does Presort contain Origin-SCF/NDC pieces  | *QualToPDF* - (SQL **quals** table) |
| -- | -- | -- |
| **projectName**   | Mailing Campaign/Project Name               | *QualToPDF* - (SQL **projects** table) |
| **EstDropDate**   | Estimated Drop Date                         | *QualToPDF* - (SQL **projects** table) |
| -- | -- | -- |
| **client**        | Client                                      | *QualToPDF* - (SQL **clients** table)  |
| -- | -- | -- |
| **sampleStatus**                      | current Sample Status (New, In Process, Issue, Complete) | *bl-status-api* - (Python-appended field) |
| **paperworkStatus**                   | current Paperwork Status (New, In Process, Issue, Complete) | *bl-status-api* - (Python-appended field) |
| **palletTagFileUser**                 | Who uploaded Pallet Tags              | *bl-status-api* - (Python-appended field) |
| **palletTagFileDownloadCount**        | Pallet Tag PDF download count         | *bl-status-api* - (Python-appended field) |
| **currentPalletTagFile**              | Pallet Tag PDF file name              | *bl-status-api* - (Python-appended field) |
| **palletTagFileUploadDateTime**       | Pallet Tag PDF Upload Date/Time       | *bl-status-api* - (Python-appended field) |
| **palletWorksheetFileUser**           | Who uploaded Pallet Worksheet         | *bl-status-api* - (Python-appended field) |
| **palletWorksheetFileDownloadCount**  | Pallet Worksheet PDF download count   | *bl-status-api* - (Python-appended field) |
| **palletWorksheetFileUploadDateTime** | Pallet Worksheet PDF Upload Date/Time | *bl-status-api* - (Python-appended field) |
| **currentPalletWorksheetFile**        | Pallet Worksheet PDF Upload Date/Time | *bl-status-api* - (Python-appended field) |
| **palletTagReplacementCount**         | Pallet Tag PDF replacement count      | *bl-status-api* - (Python-appended field) |
| **palletWorksheetReplacementCount**   | Pallet Worksheet PDF replacement count | *bl-status-api* - (Python-appended field) |
| **postalAccountingNotes**             | Accounting Notes                      | *bl-status-api* - (Python-appended field) |
| **sampleRoomNotes**                   | Sample Room Notes                     | *bl-status-api* - (Python-appended field) |




This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 1.3.0.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `-prod` flag for a production build.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).
Before running the tests make sure you are serving the app via `ng serve`.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).
