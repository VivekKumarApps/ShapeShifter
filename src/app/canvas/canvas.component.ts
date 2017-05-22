import * as _ from 'lodash';
import * as $ from 'jquery';
import {
  Component, AfterViewInit, ViewChild,
  ViewChildren, QueryList, ChangeDetectionStrategy, Input,
} from '@angular/core';
import { CanvasOverlayDirective } from './canvasoverlay.directive';
import { Command } from '../scripts/paths';
import { PathLayer, ClipPathLayer, LayerUtil, VectorLayer } from '../scripts/layers';
import { Point, Matrix, ColorUtil } from '../scripts/common';
import { AnimatorService } from '../services';
import { Store, State, getCanvasState, getActiveViewport } from '../store';
import { CanvasContainerDirective } from './canvascontainer.directive';
import { CanvasRulerDirective } from './canvasruler.directive';
import { CanvasLayersDirective } from './canvaslayers.directive';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { CanvasSizeMixin, Size } from './CanvasSizeMixin';
import { DestroyableMixin } from '../scripts/mixins';
import 'rxjs/add/observable/combineLatest';

// Canvas margin in css pixels.
const CANVAS_MARGIN = 36;

type Context = CanvasRenderingContext2D;

@Component({
  selector: 'app-canvas',
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CanvasComponent
  extends CanvasSizeMixin(DestroyableMixin())
  implements AfterViewInit {

  @ViewChild(CanvasContainerDirective) canvasContainer: CanvasContainerDirective;
  @ViewChild(CanvasLayersDirective) canvasLayers: CanvasLayersDirective;
  @ViewChild(CanvasOverlayDirective) canvasOverlay: CanvasOverlayDirective;
  @ViewChildren(CanvasRulerDirective) canvasRulers: QueryList<CanvasRulerDirective>;

  @Input() boundsObservable: Observable<Size>;

  constructor(
    private readonly animatorService: AnimatorService,
    private readonly store: Store<State>,
  ) { super() }

  ngAfterViewInit() {
    this.registerSubscription(
      Observable.combineLatest(
        this.boundsObservable,
        this.store.select(getActiveViewport),
      ).map(([bounds, viewport]) => {
        return { bounds, viewport };
      }).subscribe(({ bounds, viewport }) => {
        const w = Math.max(1, bounds.w - CANVAS_MARGIN * 2);
        const h = Math.max(1, bounds.h - CANVAS_MARGIN * 2);
        this.setDimensions({ w, h }, viewport);
      }));
    this.registerSubscription(
      this.store.select(getCanvasState)
        .subscribe(({ activeVectorLayer, hiddenLayerIds, selectedLayerIds }) => {
          this.canvasLayers.setLayerState(activeVectorLayer, hiddenLayerIds);
          this.canvasOverlay.setLayerState(activeVectorLayer, hiddenLayerIds, selectedLayerIds);
        }));
    this.registerSubscription(
      this.animatorService.asObservable()
        .filter(event => !!event.vl)
        .subscribe(event => {
          this.canvasLayers.setVectorLayer(event.vl);
        }));
  }

  // @Override
  onDimensionsChanged(bounds: Size, viewport: Size) {
    const directives = [
      this.canvasContainer,
      this.canvasLayers,
      this.canvasOverlay,
      ...this.canvasRulers.toArray(),
    ];
    directives.forEach(d => d.setDimensions(bounds, viewport));
  }

  // MOUSE DOWN
  onMouseDown(event: MouseEvent) {
    this.showRuler(event);
  }

  // MOUSE MOVE
  onMouseMove(event: MouseEvent) {
    this.showRuler(event);
  }

  // MOUSE UP
  onMouseUp(event: MouseEvent) {
    this.showRuler(event);
  }

  // MOUSE LEAVE
  onMouseLeave() {
    this.canvasRulers.forEach(r => r.hideMouse());
  }

  private showRuler(event: MouseEvent) {
    const canvasOffset = this.canvasContainer.container.offset();
    const x = (event.pageX - canvasOffset.left) / Math.max(1, this.cssScale);
    const y = (event.pageY - canvasOffset.top) / Math.max(1, this.cssScale);
    this.canvasRulers.forEach(r => r.showMouse(new Point(_.round(x), _.round(y))));
  }
}
