import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { Network } from '@awesome-cordova-plugins/network/ngx';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { Drivers } from '@ionic/storage';
import { IonicStorageModule } from '@ionic/storage-angular';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { StoreModule } from '@ngrx/store';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { TouchID } from '@awesome-cordova-plugins/touch-id/ngx';

import { UniqueDeviceID } from '@ionic-native/unique-device-id/ngx';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { AuthService } from './login/services/auth/auth.service';
import { InterceptorService } from './common/interceptors/interceptor.service';
import { NetworkValidateService } from './shared/helpers/network-validate.service';
import { ModalsModule } from './shared/modals/modals.module';
import { PipesModule } from './shared/pipes/pipes.module';
import { ProspectingPageModule } from './prospecting/prospecting.module';
import { HomePageModule } from './home/home.module';
import { environment } from '../environments/environment';
import { appReducers } from './app.reducer';
import { File } from '@awesome-cordova-plugins/file/ngx';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { EmailComposer } from '@awesome-cordova-plugins/email-composer/ngx';
import { EventService } from './services/event.service';
import { Deeplinks } from '@ionic-native/deeplinks/ngx';
import { Printer } from '@ionic-native/printer/ngx';

@NgModule({
  declarations: [AppComponent],
  entryComponents: [],
  imports: [
    PdfViewerModule,
    BrowserModule,
    HttpClientModule,
    IonicStorageModule.forRoot({
      name: '__roofingdb',
      driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
    }),
    StoreModule.forRoot(appReducers),
    StoreDevtoolsModule.instrument({
      maxAge: 25, // Retains last 25 states
      logOnly: environment.production, // Restrict extension to log-only mode
    }),
    IonicModule.forRoot(),
    AppRoutingModule,
    ModalsModule,
    PipesModule,
    ProspectingPageModule,
    HomePageModule,
  ],
  providers: [
    AuthService,
    NetworkValidateService,
    EventService,
    Network,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: InterceptorService,
      multi: true,
    },
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    File,
    EmailComposer,
    TouchID,
    UniqueDeviceID,
    Deeplinks,
    Printer
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
