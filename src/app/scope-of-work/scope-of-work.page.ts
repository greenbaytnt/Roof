import { Component, OnDestroy, OnInit, EventEmitter, Output } from '@angular/core';

import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { AppState } from '../app.reducer';
import { Project } from '../models/project.model';
import { ProjectsService } from '../services/projects.service';
import * as prospectingActions from '../prospecting/prospecting.actions';
import { NavController } from '@ionic/angular';
import { PriceModalComponent } from '../estimate/modals/price-modal/price-modal.component';
import { ModalNotesComponent } from '../shared/modals/modal-notes/modal-notes.component';
import { ModalNewContactDateComponent } from '../shared/modals/modal-new-contact-date/modal-new-contact-date.component';
import { ModalRejectProposalComponent } from '../shared/modals/modal-reject-proposal/modal-reject-proposal.component';
import { AuthService } from 'src/app/login/services/auth/auth.service';
import { SyncProjectsService } from 'src/app/services/sync-projects.service';
import { Building } from 'src/app/models/building.model';

import { ModalAcceptanceComponent } from 'src/app/shared/modals/modal-acceptance/modal-acceptance.component';
import { ActivatedRoute, Router } from '@angular/router';
import { RejectReasonsService } from 'src/app/services/reject-reasons.service';
import { AppComponent } from 'src/app/app.component';
import { RejectReason } from 'src/app/models/reject-reason.model';
import { Version } from 'src/app/models/version.model';
import { v4 as uuidv4 } from 'uuid';
import { IonRouterOutlet, MenuController, ModalController, AlertController } from '@ionic/angular';

@Component({
  selector: 'app-scope-of-work',
  templateUrl: './scope-of-work.page.html',
  styleUrls: ['./scope-of-work.page.scss']
})
export class ScopeOfWorkPage implements OnInit {
  @Output() changeVersionEmited = new EventEmitter<boolean>();

  project: Project;
  storeSubs: Subscription;
  idProject: any;
  showBuilding: boolean;
  allSWActive: boolean = true;
  showPreview: boolean = false;
  showMdlAcceptance: boolean = true;
  building: Building;
  idUserRole: number;
  rejectReasons: RejectReason[]

  version: Version;
  showCloseBtn: boolean = true;


  constructor(
    private store: Store<AppState>,
    private auth: AuthService,
    private alertController: AlertController,
    private projectService: ProjectsService,
    private modalController: ModalController,

    private router: Router,
    private route: ActivatedRoute,
    private rejectReasonService: RejectReasonsService,
    private menu: MenuController,
    private routerOutlet: IonRouterOutlet,
    private synProjects: SyncProjectsService,
    private modalService: AppComponent,
    private nav: NavController,
  ) {
    this.storeSubs = this.store.select('projects').subscribe(state => {
      this.idProject = localStorage.getItem('idProject');
      this.project = state.project;
    });



    this.store.select('projects').subscribe(state => {
      this.project = state.project;



      if (!this.project || this.project.versions.length == 0) {
        this.showMdlAcceptance = false;
        return;
      }

      const version = this.project.versions.find(x => x.active);
      if (!version) {
        return;
      }

      const { buildings } = this.project.versions.find(x => x.active);
      this.building = buildings.find(x => x.active);

      let shingle_lines = this.project.versions[0].shingle_lines.length === 1 ? true : false;
      let measure = this.project.versions[0].buildings.find(x => x.psb_measure);


      // psb_options should have only records with is_built_in = true in order to show accept icon. Only consider records with deleted_at = null.
      let Is_built = measure.psb_measure.psb_options.find(item => item.deletedAt)
      if (Is_built !== undefined) {
        this.showMdlAcceptance = true
      }
      // psb_updates should have no records with id_cost_integration = 2 in order to show accept icon

      let cost_integration = measure.psb_measure.psb_upgrades.find(item => item.id_cost_integration == 2)
      if (cost_integration == undefined) {
        this.showMdlAcceptance = true;
      }
      // End
      // Hidden with userRole and proejct_status
      this.auth.getAuthUser().then(user => {
        this.idUserRole = parseInt(user.role.id_role);

        if (this.project.id_project_status == 5) {
          this.showCloseBtn = false
        }

        if (this.project.id_project_status < 3 || shingle_lines) {
          this.showMdlAcceptance = false
        }
        if (this.project.id_project_status == 5) {
          this.showMdlAcceptance = true
        }
        if (this.project.id_project_status >= 3) {
          this.showPreview = true;
        }
        if (this.idUserRole > 2) {
          this.showMdlAcceptance = false
        }
      });
    });
  }
  getNextProjectVersion(projectVersion: string) {
    const matchVersion = projectVersion.match(/\d+/); // Find the first number in the string

    let versionNumber =  matchVersion ? parseInt(matchVersion[0], 10) : 0;
    return `Proposal ${1+versionNumber}-${new Date().toLocaleDateString()}`;
  }


  private createNewVersion(activeVersion: Version) {
    this.projectService.saveVersion({ ...this.version, active: false, is_current_version: false });

    const lastVersion = this.project.versions[this.project.versions.length - 1];
    const nextProjectVersion = this.getNextProjectVersion(lastVersion.project_version);
    const newVersionId = uuidv4();

    return {
      ...activeVersion,
      id: newVersionId,
      project_version: nextProjectVersion,
      active: true,
      is_current_version: true,
      isModified: true,
      id_cost_type: activeVersion.id_cost_type ?? 1,
      shingle_lines: activeVersion.shingle_lines.map(x => ({ ...x, isModified: true })),
      pv_trademarks: activeVersion.pv_trademarks.map(x => ({ ...x, isModified: true })),
      buildings: activeVersion.buildings.map((building) => {
        // const newBuildingId = uuidv4();
        let newMeasure = null;
        if (building.psb_measure) {
          // const newMeasureId = uuidv4();
          const newVerifies = building.psb_measure.psb_verifieds?.map((v) => ({ ...v,isModified: true }));
          const newNoRequireds = building.psb_measure.psb_no_requireds?.map((v) => ({ ...v,isModified: true }));
          const newSlopes = building.psb_measure.psb_slopes?.map((v) => ({ ...v,isModified: true }));
          const newLayers = building.psb_measure.psb_layers?.map((v) => ({ ...v,isModified: true }));
          const newOptions = building.psb_measure.psb_options?.map((v) => ({ ...v,isModified: true }));
          const newCrickets = building.psb_measure.psb_crickets?.map((v) => ({ ...v,isModified: true }));
          const newChimneys = building.psb_measure.psb_chimneys?.map((v) => ({ ...v,isModified: true }));
          const newSkylights = building.psb_measure.psb_skylights?.map((v) => ({ ...v,isModified: true }));
          const newMaterials = building.psb_measure.psb_selected_materials?.map((v) => ({ ...v,isModified: true }));
          const newUpgrades = building.psb_measure.psb_upgrades?.map((v) => ({ ...v,isModified: true }));

          newMeasure = {
            ...building.psb_measure,
            // id: newMeasureId,
            // id_project_building: newBuildingId,
            psb_verifieds: newVerifies,
            psb_no_requireds: newNoRequireds,
            psb_slopes: newSlopes,
            psb_layers: newLayers,
            psb_options: newOptions,
            psb_crickets: newCrickets,
            psb_chimneys: newChimneys,
            psb_skylights: newSkylights,
            psb_selected_materials: newMaterials,
            psb_upgrades: newUpgrades,
            isModified: true
          };
        }

        return { ...building, pb_scopes: [],  psb_measure: newMeasure, isModified: true };
      })
    };
  }

  async clickCreateVersion() {
    const alert = await this.alertController.create({
      header: 'Are you sure you want create a new  proposal option?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
          }
        }, {
          text: 'Yes',
          handler: () => {
            this.createVersion();
          }
        }
      ]
    });
    await alert.present()
  }
  async createVersion() {
    let versions: Version[];
    const activeVersion = this.project.versions.find(x => x.active);
    const newVersion = this.createNewVersion(activeVersion);

    versions = [...this.project.versions.map((x) => {
      return { ...x, active: false, is_current_version: false, isModified: true };
    }), newVersion];

    const projectUpdated: Project = {
      ...this.project,
      versions: versions,
      isModified: true,
      id_project_status: 1,
      project_status: {
        id: 1,
        project_status: "Lead"
      }
    };

    await this.projectService.update(this.project.id, projectUpdated);
    this.changeVersionEmited.emit(true);
  }

  /**
* Show notes modal
*/
  async openAcceptanceModal() {

    this.rejectReasons = await (await this.rejectReasonService.getMockRejectReason()).data

    let reject_message;

    if (this.rejectReasons[this.project.id_reject_reason - 1].id === 6) {
      reject_message = "This proposal was marked as " + this.project.reject_reason;
    }
    else
      reject_message = "This proposal was marked as " + this.rejectReasons[this.project.id_reject_reason - 1].reason;

    if (this.project.id_project_status == 5) {
      const alert = await this.alertController.create({
        header: 'Are you sure you want accept this proposal?',
        message: reject_message,
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
            cssClass: 'secondary',
            handler: () => {
            }
          }, {
            text: 'Accept',
            handler: () => {
              this.acceptContinue();
            }
          }
        ]
      });

      await alert.present();
    }

    else {
      this.acceptContinue()
    }

  }


  async acceptContinue() {
    const modal = await this.modalController.create({
      component: ModalAcceptanceComponent,
      cssClass: 'fullscreen',
    });
    // Escuchar el evento cuando se cierra la modal
    modal.onDidDismiss().then((data) => {
      if (data?.data?.saveDb) {
        setTimeout(() => { this.synProjects.syncOffline(); }, 500);
      }
      if (data?.data?.redirect) {
        this.router.navigate(['/home/prospecting']);
      }
    });
    await modal.present();

  }

  ngOnInit() { }

  onDestroy(): void {
    if (this.storeSubs) {
      this.storeSubs.unsubscribe();
    }
  }

  ionViewWillEnter() {
    this.getProject();
  }

  getProject() {
    this.projectService.get(this.idProject).then(
      result => {
        result.data.versions.map(x => {
          x.active = x.is_current_version;
        });
        this.store.dispatch(prospectingActions.setProject({ project: result.data }));
      },
      error => {
        console.log(error);
      }
    );
  }

  goToScope() {
    localStorage.removeItem('storeproject');
    localStorage.setItem('storeproject', JSON.stringify(this.project));
    this.nav.navigateForward('pdf-viewer-page');
  }
  async openPriceModal() {
    const modal = await this.modalController.create({
      component: PriceModalComponent
    });
    await modal.present();
  }

  async openNotesModal() {
    const modal = await this.modalController.create({
      component: ModalNotesComponent,
      cssClass: 'fullscreen'
    });
    await modal.present();
  }

  /**
   * Show New Contact Date Modal
   * @return void
   */
  async openNewContactDateModal() {
    const modal = await this.modalController.create({
      component: ModalNewContactDateComponent,
      cssClass: 'small-screen',
    });
    await modal.present();
  }
  /**
   * Show Reject Proposal Modal
   * @return void
   */
  async openRejectProposalModal() {
    const modal = await this.modalController.create({
      component: ModalRejectProposalComponent,
      cssClass: 'medium-screen',
    });
    await modal.present();
  }
}
