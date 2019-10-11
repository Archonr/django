from django.urls import path, include
from django.conf.urls import url
from . import views
from django.contrib import admin

urlpatterns = [
#    path('do_login', views.do_login),
    path('accounts/', include('django.contrib.auth.urls')),
   # path('', views.index),
    path('', views.greeting),
    url(r'^projects/3/', views.calculator),
    url(r'^projects/(?P<project_id>\d+)/', views.projects),

]

